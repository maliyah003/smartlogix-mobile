const TripCost = require('../models/tripCost.model');
const Trip = require('../models/trip.model');
const mongoose = require('mongoose');

async function resolveTripId(tripIdentifier) {
    if (!tripIdentifier) throw new Error('Trip ID is required');
    if (mongoose.Types.ObjectId.isValid(tripIdentifier)) {
        const trip = await Trip.findById(tripIdentifier);
        if (trip) return trip._id;
    }
    const trip = await Trip.findOne({
        $or: [{ tripId: tripIdentifier }, { jobId: tripIdentifier }]
    });
    if (trip) return trip._id;
    throw new Error('Trip not found');
}

class TripCostService {
    /**
     * Start a trip cost record with initial odometer
     */
    async saveStartOdometer(tripId, driverId, startOdometer) {
        // Resolve trip ID
        const actualTripId = await resolveTripId(tripId);

        // Check if cost record already exists
        let tripCost = await TripCost.findOne({ trip: actualTripId });
        if (tripCost) {
            // Update if exists but not finalized
            if (tripCost.status === 'finalized') {
                throw new Error('Trip is already finalized');
            }
            tripCost.startOdometer = startOdometer;
            tripCost.driver = driverId;
        } else {
            // Create new
            tripCost = new TripCost({
                trip: actualTripId,
                driver: driverId,
                startOdometer
            });
        }

        await tripCost.save();
        return tripCost;
    }

    /**
     * Save draft details without final validation or calculations
     */
    async saveDraft(tripId, updateData) {
        const actualTripId = await resolveTripId(tripId);
        const tripCost = await TripCost.findOne({ trip: actualTripId });
        if (!tripCost) throw new Error('Start odometer reading not found for this trip');
        if (tripCost.status === 'finalized') throw new Error('Trip is already finalized');

        // Update fields
        ['endOdometer', 'fuelPrice', 'litersRefilled', 'parkingFee', 'tollFee'].forEach(field => {
            if (updateData[field] !== undefined) {
                tripCost[field] = updateData[field];
            }
        });

        await tripCost.save();
        return tripCost;
    }

    /**
     * Clear draft details (but keep start odometer)
     */
    async resetDraft(tripId) {
        const actualTripId = await resolveTripId(tripId);
        const tripCost = await TripCost.findOne({ trip: actualTripId });
        if (!tripCost) throw new Error('Trip cost record not found');
        if (tripCost.status === 'finalized') throw new Error('Cannot reset a finalized trip');

        tripCost.endOdometer = null;
        tripCost.fuelPrice = null;
        tripCost.litersRefilled = null;
        tripCost.parkingFee = 0;
        tripCost.tollFee = 0;
        
        await tripCost.save();
        return tripCost;
    }

    /**
     * Finalize trip cost, perform validations and calculations
     */
    async finalizeTripCost(tripId, updateData) {
        const actualTripId = await resolveTripId(tripId);
        const tripCost = await TripCost.findOne({ trip: actualTripId });
        if (!tripCost) throw new Error('Start odometer reading not found for this trip');
        if (tripCost.status === 'finalized') throw new Error('Trip is already finalized');

        // Merge update data
        ['endOdometer', 'fuelPrice', 'litersRefilled', 'parkingFee', 'tollFee'].forEach(field => {
            if (updateData[field] !== undefined) {
                tripCost[field] = updateData[field];
            }
        });

        // Validations
        if (!tripCost.endOdometer || tripCost.endOdometer <= tripCost.startOdometer) {
            throw new Error('End odometer must be greater than start odometer.');
        }
        if (tripCost.fuelPrice === null || tripCost.fuelPrice < 0) {
            throw new Error('Fuel price cannot be negative.');
        }
        if (!tripCost.litersRefilled || tripCost.litersRefilled <= 0) {
            throw new Error('Refilled liters must be greater than zero.');
        }
        if (tripCost.parkingFee < 0 || tripCost.tollFee < 0) {
            throw new Error('Parking and toll fees cannot be negative.');
        }

        // Calculations
        const distance = tripCost.endOdometer - tripCost.startOdometer;
        const fuelEfficiency = distance / tripCost.litersRefilled;
        const fuelCost = tripCost.litersRefilled * tripCost.fuelPrice;
        const totalCost = fuelCost + (tripCost.parkingFee || 0) + (tripCost.tollFee || 0);

        tripCost.calculations = {
            distance: Number(distance.toFixed(1)),
            fuelEfficiency: Number(fuelEfficiency.toFixed(2)),
            fuelCost: Number(fuelCost.toFixed(2)),
            totalCost: Number(totalCost.toFixed(2))
        };

        tripCost.status = 'finalized';
        await tripCost.save();
        
        return tripCost;
    }

    /**
     * Get daily fuel consistency report for all vehicles
     */
    async getDailyVehicleConsistency() {
        // Past 7 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const tripCosts = await TripCost.find({
            status: 'finalized',
            updatedAt: { $gte: sevenDaysAgo, $lt: tomorrow }
        }).populate({
            path: 'trip',
            populate: { path: 'vehicle' }
        });

        const vehicleGroups = {};

        tripCosts.forEach(tc => {
            if (tc.trip && tc.trip.vehicle && tc.trip.vehicle.registrationNumber) {
                const vehicle = tc.trip.vehicle;
                const regNo = vehicle.registrationNumber;
                
                // Filter out records that were finalized before the vehicle's last consistency reset
                if (vehicle.fuelConsistencyResetAt && tc.updatedAt < vehicle.fuelConsistencyResetAt) {
                    return;
                }

                if (!vehicleGroups[regNo]) {
                    vehicleGroups[regNo] = [];
                }
                vehicleGroups[regNo].push(tc.calculations.fuelEfficiency);
            }
        });

        const report = [];

        for (const [regNo, efficiencies] of Object.entries(vehicleGroups)) {
            const tripCount = efficiencies.length;
            const avgConsumption = Number((efficiencies.reduce((a, b) => a + b, 0) / tripCount).toFixed(2));
            
            let status = 'Consistent';
            let variance = 0;

            if (tripCount > 1) {
                const max = Math.max(...efficiencies);
                const min = Math.min(...efficiencies);
                variance = Number((max - min).toFixed(2));
                if (variance > 2) {
                    status = 'High Variation';
                }
            } else {
                status = 'Insufficient Data';
            }

            report.push({
                vehicleRegistration: regNo,
                tripsCount: tripCount, // Changed from tripsToday to reflect 7-day window
                averageConsumption: avgConsumption,
                variance: variance,
                status: status
            });
        }

        return report;
    }

    /**
     * Reset fuel consistency record for a specific vehicle
     */
    async resetFuelConsistency(registrationNumber) {
        const Vehicle = require('../models/vehicle.model');
        const vehicle = await Vehicle.findOne({ registrationNumber });
        if (!vehicle) throw new Error('Vehicle not found');

        vehicle.fuelConsistencyResetAt = new Date();
        await vehicle.save();
        return vehicle;
    }
    
    /**
     * Get all trip costs for web dashboard
     */
    async getAllTripCosts() {
        return TripCost.find()
            .populate('driver', 'name')
            .populate({
                path: 'trip',
                select: 'tripId primaryJob',
                populate: [
                    { path: 'primaryJob', select: 'jobId pricing' },
                    { path: 'vehicle', select: 'registrationNumber' }
                ]
            })
            .sort({ updatedAt: -1 });
    }
    
    /**
     * Get specific trip cost
     */
    async getTripCost(tripId) {
        const actualTripId = await resolveTripId(tripId);
        return TripCost.findOne({ trip: actualTripId });
    }
}

module.exports = new TripCostService();
