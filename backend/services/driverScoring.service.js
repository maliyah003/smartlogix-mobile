const DriverIncident = require('../models/driverIncident.model');
const Trip = require('../models/trip.model');

const BASE_MONTHLY_SCORE = 100;
const MAX_DAILY_DEDUCTION = 30;
const WEEKLY_DECAY_FACTOR = 0.8; // reduce penalties by 20% every week

function startOfMonthUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfMonthUTC(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function dayKeyUTC(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function weeksSince(occurredAt, asOf) {
    const ms = asOf.getTime() - occurredAt.getTime();
    if (ms <= 0) return 0;
    return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

function applyWeeklyDecay(penalty, occurredAt, asOf) {
    const w = weeksSince(occurredAt, asOf);
    return penalty * Math.pow(WEEKLY_DECAY_FACTOR, w);
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function computeIncidentPenalty(incident) {
    const { category, severity, verified, meta = {} } = incident;

    // Verified gating for categories prone to abuse/bias
    if ((category === 'complaint' || category === 'traffic_violation') && !verified) {
        return 0;
    }

    if (category === 'accident') {
        if (severity === 'minor') return 15;
        if (severity === 'moderate') return 25;
        if (severity === 'major') return 40;
        return 0;
    }

    if (category === 'complaint') {
        // Mobile/admin forms submit complaint severities as minor/moderate/serious.
        if (severity === 'minor') return 5;
        if (severity === 'moderate') return 10;
        if (severity === 'serious' || severity === 'major') return 20;
        return 0;
    }

    if (category === 'delay') {
        // meta.delayMinutes is expected when logging delays manually/automatically
        const delayMinutes = Number(meta.delayMinutes);
        if (!Number.isFinite(delayMinutes)) return 0;

        let base = 0;
        if (delayMinutes >= 10 && delayMinutes < 30) base = 3;
        else if (delayMinutes >= 30 && delayMinutes < 60) base = 5;
        else if (delayMinutes >= 60) base = 10;

        const reason = String(meta.reason || '').toLowerCase();
        if (reason === 'traffic' || reason === 'weather') {
            base = base * 0.5;
        }
        return base;
    }

    if (category === 'missed_delivery') {
        const validReason = Boolean(meta.validReason);
        return validReason ? 5 : 15;
    }

    if (category === 'vehicle_issue') {
        if (severity === 'minor') return 3;
        if (severity === 'moderate') return 8;
        if (severity === 'major' || severity === 'serious') return 15;
        return 0;
    }

    if (category === 'traffic_violation') {
        if (severity === 'minor') return 5;
        if (severity === 'moderate') return 10;
        if (severity === 'serious') return 20;
        return 0;
    }

    return 0;
}

async function computeOnTimeBonus({ driverId, monthStart, monthEnd }) {
    // On-time defined as arriving < 10 minutes late vs job delivery datetime
    // (delay penalties start at 10 minutes)
    const trips = await Trip.find({
        driver: driverId,
        status: 'completed',
        completedAt: { $gte: monthStart, $lt: monthEnd }
    }).populate('primaryJob');

    const total = trips.length;
    if (total === 0) return { bonus: 0, onTimeRate: null, totalTrips: 0 };

    let onTime = 0;
    for (const t of trips) {
        const endTime = t.actualTimes?.endTime || t.completedAt;
        const due = t.primaryJob?.delivery?.datetime;
        if (!endTime || !due) continue;
        const diffMin = (new Date(endTime).getTime() - new Date(due).getTime()) / 60000;
        if (diffMin < 10) onTime += 1;
    }

    const onTimeRate = total > 0 ? onTime / total : null;
    const bonus = onTimeRate !== null && onTimeRate > 0.95 ? 5 : 0;
    return { bonus, onTimeRate, totalTrips: total };
}

function computeNoIncidentWeeksBonus({ incidents, monthStart, monthEnd }) {
    // If the driver has any incidents in the month, do not offset them
    // with clean-week bonuses. This keeps the score visibly responsive.
    if (incidents.length > 0) return 0;

    // Calendar weeks (Mon 00:00 UTC to Mon 00:00 UTC) with zero incidents earn +10.
    // This keeps it simple and prevents gaming by chopping days.
    const incidentDays = new Set(incidents.map(i => dayKeyUTC(i.occurredAt)));

    let bonus = 0;
    const cur = new Date(monthStart);

    // Move to the first Monday boundary at/after monthStart
    const day = cur.getUTCDay(); // 0 Sun ... 1 Mon
    const daysToMonday = (day === 0 ? 1 : (8 - day)) % 7; // if Mon -> 0
    cur.setUTCDate(cur.getUTCDate() + daysToMonday);

    // Consider week windows fully inside the month
    for (let weekStart = new Date(cur); weekStart < monthEnd; ) {
        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
        if (weekEnd > monthEnd) break;

        let hasIncident = false;
        for (let d = new Date(weekStart); d < weekEnd; d.setUTCDate(d.getUTCDate() + 1)) {
            if (incidentDays.has(dayKeyUTC(d))) {
                hasIncident = true;
                break;
            }
        }
        if (!hasIncident) bonus += 10;

        weekStart = weekEnd;
    }

    return bonus;
}

exports.computeMonthlyDriverScore = async ({ driverId, asOf = new Date(), month = null }) => {
    const baseDate = month ? new Date(month) : asOf;
    const monthStart = startOfMonthUTC(baseDate);
    const monthEnd = endOfMonthUTC(baseDate);

    const incidents = await DriverIncident.find({
        driver: driverId,
        occurredAt: { $gte: monthStart, $lt: monthEnd }
    }).sort({ occurredAt: 1 });

    // Deductions by day with daily cap (after weekly decay)
    const perDay = new Map(); // dayKey -> { sum, items: [] }
    let rawTotal = 0;

    for (const inc of incidents) {
        const basePenalty = computeIncidentPenalty(inc);
        if (basePenalty <= 0) continue;
        const decayed = applyWeeklyDecay(basePenalty, inc.occurredAt, asOf);
        const key = dayKeyUTC(inc.occurredAt);
        const day = perDay.get(key) || { sum: 0, items: [] };
        day.sum += decayed;
        day.items.push({ incidentId: inc._id, category: inc.category, severity: inc.severity, verified: inc.verified, basePenalty, decayedPenalty: decayed });
        perDay.set(key, day);
        rawTotal += decayed;
    }

    let cappedTotal = 0;
    for (const { sum } of perDay.values()) {
        cappedTotal += Math.min(MAX_DAILY_DEDUCTION, sum);
    }

    const noIncidentWeeksBonus = computeNoIncidentWeeksBonus({ incidents, monthStart, monthEnd });
    const onTime = await computeOnTimeBonus({ driverId, monthStart, monthEnd });
    const bonuses = noIncidentWeeksBonus + onTime.bonus;

    const score = clamp(BASE_MONTHLY_SCORE - cappedTotal + bonuses, 0, 100);

    return {
        driverId,
        monthStart,
        monthEnd,
        asOf,
        baseScore: BASE_MONTHLY_SCORE,
        deductions: {
            rawTotal: Math.round(rawTotal * 100) / 100,
            cappedTotal: Math.round(cappedTotal * 100) / 100,
            maxPerDay: MAX_DAILY_DEDUCTION,
            byDay: Array.from(perDay.entries()).map(([day, v]) => ({
                day,
                sum: Math.round(v.sum * 100) / 100,
                cappedSum: Math.round(Math.min(MAX_DAILY_DEDUCTION, v.sum) * 100) / 100,
                items: v.items
            }))
        },
        bonuses: {
            total: bonuses,
            noIncidentWeeks: noIncidentWeeksBonus,
            onTimeRateOver95: onTime.bonus,
            onTimeRate: onTime.onTimeRate,
            totalTrips: onTime.totalTrips
        },
        score
    };
};

