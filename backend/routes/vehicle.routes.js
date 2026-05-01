const express = require('express');
const router = express.Router();
const Vehicle = require('../models/vehicle.model');
const Driver = require('../models/driver.model');
const Notification = require('../models/notification.model');
const COMPLIANCE_OUT_OF_SERVICE_DAYS = 3;

function hasExpiredCompliance(vehicle, now = new Date()) {
    const licenseExpired = vehicle.licenseEndDate && new Date(vehicle.licenseEndDate) < now;
    const insuranceExpired = vehicle.insuranceEndDate && new Date(vehicle.insuranceEndDate) < now;
    return Boolean(licenseExpired || insuranceExpired);
}

function daysUntil(dateLike, now = new Date()) {
    if (!dateLike) return null;
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return null;
    const ms = d.getTime() - now.getTime();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function getComplianceRisk(vehicle, now = new Date(), thresholdDays = 30) {
    const licenseDays = daysUntil(vehicle.licenseEndDate, now);
    const insuranceDays = daysUntil(vehicle.insuranceEndDate, now);

    const licenseExpired = typeof licenseDays === 'number' && licenseDays < 0;
    const insuranceExpired = typeof insuranceDays === 'number' && insuranceDays < 0;

    const licenseExpiringSoon = typeof licenseDays === 'number' && licenseDays >= 0 && licenseDays <= thresholdDays;
    const insuranceExpiringSoon = typeof insuranceDays === 'number' && insuranceDays >= 0 && insuranceDays <= thresholdDays;

    const hasAny = Boolean(vehicle.licenseEndDate || vehicle.insuranceEndDate);

    return {
        hasAny,
        licenseDays,
        insuranceDays,
        licenseExpired,
        insuranceExpired,
        licenseExpiringSoon,
        insuranceExpiringSoon,
        shouldBeOutOfService: Boolean(licenseExpired || insuranceExpired || licenseExpiringSoon || insuranceExpiringSoon),
    };
}

async function maybeNotifyAdminsAboutCompliance(vehicle, risk, now = new Date()) {
    try {
        if (!risk?.hasAny) return;
        if (!risk.licenseExpiringSoon && !risk.insuranceExpiringSoon && !risk.licenseExpired && !risk.insuranceExpired) return;

        const admins = await Driver.find({ isAdmin: true }).select('_id').lean();
        if (!admins?.length) return;

        const parts = [];
        if (risk.licenseExpired) parts.push('license is expired');
        else if (risk.licenseExpiringSoon) parts.push(`license expires in ${risk.licenseDays} day(s)`);
        if (risk.insuranceExpired) parts.push('insurance is expired');
        else if (risk.insuranceExpiringSoon) parts.push(`insurance expires in ${risk.insuranceDays} day(s)`);

        const title = 'Vehicle Compliance Reminder';
        const message = `Vehicle ${vehicle.registrationNumber}: ${parts.join(' and ')}. Please renew.`;
        const link = '/vehicles';

        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        await Promise.all(
            admins.map(async (admin) => {
                const existing = await Notification.findOne({
                    driverId: admin._id,
                    title,
                    message,
                    createdAt: { $gte: since },
                }).select('_id');
                if (existing) return;
                await Notification.create({
                    title,
                    message,
                    type: 'system',
                    link,
                    driverId: admin._id,
                });
            })
        );
    } catch (e) {
        // Never block vehicle APIs for notification issues.
        console.warn('Vehicle compliance notify error:', e?.message || e);
    }
}

async function enforceOutOfServiceIfNonCompliant(vehicle, now = new Date()) {
    if (!vehicle) return vehicle;
    const risk = getComplianceRisk(vehicle, now, COMPLIANCE_OUT_OF_SERVICE_DAYS);
    if (risk.shouldBeOutOfService && vehicle.status !== 'Out of Service') {
        vehicle.status = 'Out of Service';
        vehicle.lastUpdated = now;
        await vehicle.save();
    } else if (!risk.shouldBeOutOfService && vehicle.status === 'Out of Service') {
        // If compliance dates are renewed, move vehicle back to service automatically.
        vehicle.status = 'available';
        vehicle.lastUpdated = now;
        await vehicle.save();
    }
    await maybeNotifyAdminsAboutCompliance(vehicle, risk, now);
    return vehicle;
}

/**
 * GET /api/vehicles
 * Get all vehicles with optional filtering
 */
router.get('/', async (req, res) => {
    try {
        const { status, type } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (type) filter.vehicleType = type;

        const vehicles = await Vehicle.find(filter).sort({ registrationNumber: 1 });
        const now = new Date();
        await Promise.all(vehicles.map((v) => enforceOutOfServiceIfNonCompliant(v, now)));

        return res.status(200).json({
            success: true,
            count: vehicles.length,
            vehicles: vehicles
        });

    } catch (error) {
        console.error('Get vehicles error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve vehicles',
            details: error.message
        });
    }
});


/**
 * GET /api/vehicles/:id
 * Get vehicle by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        await enforceOutOfServiceIfNonCompliant(vehicle);

        return res.status(200).json({
            success: true,
            vehicle: vehicle
        });

    } catch (error) {
        console.error('Get vehicle error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve vehicle',
            details: error.message
        });
    }
});


/**
 * POST /api/vehicles
 * Create a new vehicle
 */
router.post('/', async (req, res) => {
    try {
        const { registrationNumber, vehicleType, model, capacity, fuelConsumption, licenseEndDate, insuranceEndDate, currentLocation, driver, usageHours, serviceRecords, status } = req.body;

        if (!registrationNumber || !vehicleType || !model || !capacity || !currentLocation) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        if (!licenseEndDate || !insuranceEndDate) {
            return res.status(400).json({
                success: false,
                error: 'License expiry date and insurance expiry date are required'
            });
        }

        const newVehicle = new Vehicle({
            registrationNumber,
            vehicleType,
            model,
            capacity,
            fuelConsumption,
            licenseEndDate,
            insuranceEndDate,
            currentLocation: {
                type: 'Point',
                coordinates: currentLocation.coordinates
            },
            usageHours: usageHours || 0,
            serviceRecords: serviceRecords || [],
            driver: driver || {},
            status: status || 'Active'
        });

        await enforceOutOfServiceIfNonCompliant(newVehicle);

        await newVehicle.save();

        return res.status(201).json({
            success: true,
            message: 'Vehicle created successfully',
            vehicle: newVehicle
        });

    } catch (error) {
        console.error('Create vehicle error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create vehicle',
            details: error.message
        });
    }
});

/**
 * PATCH /api/vehicles/:id/location
 * Update vehicle location
 */
router.patch('/:id/location', async (req, res) => {
    try {
        const { longitude, latitude } = req.body;

        if (!longitude || !latitude) {
            return res.status(400).json({
                success: false,
                error: 'Longitude and latitude are required'
            });
        }

        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        await vehicle.updateLocation(longitude, latitude);

        return res.status(200).json({
            success: true,
            message: 'Vehicle location updated',
            vehicle: vehicle
        });

    } catch (error) {
        console.error('Update location error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update location',
            details: error.message
        });
    }
});

/**
 * PATCH /api/vehicles/:id/status
 * Update vehicle status
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const vehicle = await Vehicle.findById(req.params.id);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        vehicle.status = status;
        if (getComplianceRisk(vehicle).shouldBeOutOfService) {
            vehicle.status = 'Out of Service';
        }
        vehicle.lastUpdated = new Date();
        await vehicle.save();

        return res.status(200).json({
            success: true,
            message: 'Vehicle status updated',
            vehicle: vehicle
        });

    } catch (error) {
        console.error('Update status error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update status',
            details: error.message
        });
    }
});

/**
 * PUT /api/vehicles/:id
 * Update full vehicle details
 */
router.put('/:id', async (req, res) => {
    try {
        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { ...req.body, lastUpdated: new Date() },
            { new: true, runValidators: true }
        );

        if (!updatedVehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

        await enforceOutOfServiceIfNonCompliant(updatedVehicle);

        res.json({ success: true, vehicle: updatedVehicle });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/vehicles/:id
 * Delete a vehicle
 */
router.delete('/:id', async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ success: false, error: 'Vehicle not found' });
        }

        // Prevent deletion if vehicle is not in an idle/maintainable state (legacy + new statuses)
        if (!['Active', 'In Maintenance', 'available', 'maintenance'].includes(vehicle.status)) {
            return res.status(400).json({ success: false, error: `Cannot delete vehicle with status: ${vehicle.status}` });
        }

        await Vehicle.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Vehicle deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
