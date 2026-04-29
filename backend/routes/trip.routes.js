const express = require('express');
const router = express.Router();
const Trip = require('../models/trip.model');
const Notification = require('../models/notification.model');
const firebaseService = require('../services/firebase.service');

async function createNotificationSafe(payload) {
    try {
        await Notification.create(payload);
    } catch (err) {
        console.warn('Notification create failed:', err?.message || err);
    }
}

function findTripByIdentifier(identifier, populate = false) {
    let query = Trip.findOne({
        $or: [{ tripId: identifier }, { jobId: identifier }]
    });

    if (populate) {
        query = query
            .populate('vehicle')
            .populate('driver')
            .populate('primaryJob')
            .populate('backhaulJob');
    }

    return query;
}


/**
 * GET /api/trips
 * Get a list of all trips
 */
router.get('/', async (req, res) => {
    try {
        const trips = await Trip.find()
            .populate('vehicle')
            .populate('driver')
            .populate('primaryJob')
            .populate('backhaulJob')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: trips.length,
            trips: trips
        });
    } catch (error) {
        console.error('Get all trips error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve trips',
            details: error.message
        });
    }
});

/**
 * GET /api/trips/:tripId
 * Get trip details by ID
 */
router.get('/:tripId', async (req, res) => {
    try {
        const trip = await findTripByIdentifier(req.params.tripId, true);

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        return res.status(200).json({
            success: true,
            trip: trip
        });

    } catch (error) {
        console.error('Get trip error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve trip',
            details: error.message
        });
    }
});

/**
 * GET /api/trips/driver/:driverId
 * Get active or scheduled trips for a specific driver (Mobile App)
 */
router.get('/driver/:driverId', async (req, res) => {
    try {
        const trips = await Trip.find({
            driver: req.params.driverId
        })
            .populate('vehicle')
            .populate('primaryJob')
            .populate('backhaulJob')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: trips.length,
            trips: trips
        });

    } catch (error) {
        console.error('Get driver trips error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve driver trips',
            details: error.message
        });
    }
});

/**
 * PATCH /api/trips/:tripId/status
 * Update trip status
 */
router.patch('/:tripId/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                error: 'Status is required'
            });
        }

        const trip = await findTripByIdentifier(req.params.tripId);

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        trip.status = status;

        if (status === 'active') {
             if (!trip.actualTimes) trip.actualTimes = {};
             trip.actualTimes.startTime = new Date();
             
             // Update associated Jobs to 'in-transit'
             const Job = require('../models/job.model');
             if (trip.primaryJob) {
                 await Job.findByIdAndUpdate(trip.primaryJob, { status: 'in-transit' });
             }
             if (trip.backhaulJob) {
                 await Job.findByIdAndUpdate(trip.backhaulJob, { status: 'in-transit' });
             }
        }

        if (status === 'completed') {
            trip.completedAt = new Date();
            if (!trip.actualTimes) trip.actualTimes = {};
            trip.actualTimes.endTime = new Date();
            

            
            // Update associated Jobs to 'completed'
            const Job = require('../models/job.model');
            if (trip.primaryJob) {
                 await Job.findByIdAndUpdate(trip.primaryJob, { status: 'completed' });
            }
            if (trip.backhaulJob) {
                 await Job.findByIdAndUpdate(trip.backhaulJob, { status: 'completed' });
            }
        }

        await trip.save();

        // Update Firebase
        await firebaseService.updateTripStatus(trip.jobId || trip.tripId, status);

        // Notify Web App Admin
        if (status === 'active') {
            await createNotificationSafe({
                title: 'Trip Started',
                message: `Driver has started ${trip.jobId || trip.tripId}`,
                type: 'trip_started',
                link: '/trips'
            });
            if (trip.driver) {
                await createNotificationSafe({
                    title: 'Trip In Progress',
                    message: `Trip ${trip.jobId || trip.tripId} is now active.`,
                    type: 'system',
                    link: '/trips',
                    driverId: trip.driver
                });
            }
        } else if (status === 'completed') {
            await createNotificationSafe({
                title: 'Trip Completed',
                message: `Driver has successfully completed ${trip.jobId || trip.tripId}`,
                type: 'trip_completed',
                link: '/trips'
            });
            if (trip.driver) {
                await createNotificationSafe({
                    title: 'Trip Completed',
                    message: `You have completed trip ${trip.jobId || trip.tripId}.`,
                    type: 'trip_completed',
                    link: '/trips',
                    driverId: trip.driver
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Trip status updated',
            trip: trip
        });

    } catch (error) {
        console.error('Update trip status error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update trip status',
            details: error.message
        });
    }
});

/**
 * GET /api/trips/:tripId/position
 * Get driver's current position safely from MongoDB
 */
router.get('/:tripId/position', async (req, res) => {
    try {
        const trip = await findTripByIdentifier(req.params.tripId).select('currentPosition');
        if (!trip || !trip.currentPosition) {
            return res.status(404).json({ success: false, error: 'Position not found' });
        }
        return res.status(200).json({
            success: true,
            coordinates: trip.currentPosition.coordinates // [lng, lat]
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch position' });
    }
});

/**
 * POST /api/trips/:tripId/position
 * Update driver's current position
 */
router.post('/:tripId/position', async (req, res) => {
    try {
        const { longitude, latitude } = req.body;

        if (!longitude || !latitude) {
            return res.status(400).json({
                success: false,
                error: 'Longitude and latitude are required'
            });
        }

        const trip = await findTripByIdentifier(req.params.tripId);

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        // Update in MongoDB
        await trip.updatePosition(longitude, latitude);

        // Update in Firebase for real-time tracking
        await firebaseService.updateDriverPosition(
            trip.jobId || trip.tripId,
            longitude,
            latitude
        );

        return res.status(200).json({
            success: true,
            message: 'Position updated'
        });

    } catch (error) {
        console.error('Update position error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update position',
            details: error.message
        });
    }
});

/**
 * DELETE /api/trips/:tripId
 * Delete a trip and release its assigned jobs and vehicle.
 */
router.delete('/:tripId', async (req, res) => {
    try {
        const trip = await findTripByIdentifier(req.params.tripId);

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        const Job = require('../models/job.model');
        const Vehicle = require('../models/vehicle.model');
        const Driver = require('../models/driver.model');

        // Free up the primary job
        if (trip.primaryJob) {
            await Job.findByIdAndUpdate(trip.primaryJob, {
                status: 'pending',
                $unset: { assignedVehicle: 1, assignedTrip: 1 }
            });
        }

        // Free up the backhaul job if it exists
        if (trip.backhaulJob) {
            await Job.findByIdAndUpdate(trip.backhaulJob, {
                status: 'pending',
                $unset: { assignedVehicle: 1, assignedTrip: 1 }
            });
        }

        // Free up the Vehicle
        if (trip.vehicle) {
            await Vehicle.findByIdAndUpdate(trip.vehicle, {
                status: 'available',
                $unset: { currentTrip: 1 }
            });
        }

        // Free up the Driver
        if (trip.driver) {
            await Driver.findByIdAndUpdate(trip.driver, {
                status: 'available',
                $unset: { currentTrip: 1, currentVehicle: 1 }
            });
        }

        // Remove the trip itself
        await Trip.findByIdAndDelete(trip._id);

        return res.status(200).json({
            success: true,
            message: 'Trip successfully deleted. Assocaited jobs and resources are now available.'
        });

    } catch (error) {
        console.error('Delete trip error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete trip',
            details: error.message
        });
    }
});

/**
 * POST /api/trips/:tripId/refuse
 * Driver requests to refuse a trip with a reason.
 */
router.post('/:tripId/refuse', async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Reason is required for refusing a trip'
            });
        }

        const trip = await findTripByIdentifier(req.params.tripId);

        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }

        // Set the refusal request to pending
        trip.refusalRequest = {
            requested: true,
            reason: reason,
            status: 'pending'
        };

        await trip.save();

        // Spawn a Dashboard Notification for the Admin
        await createNotificationSafe({
            title: 'Trip Refusal Request',
            message: `Driver for ${trip.jobId || trip.tripId} requested to refuse the trip: "${reason}"`,
            type: 'trip_refused',
            link: '/refusals'
        });

        // Also notify requesting driver that request is submitted and pending.
        if (trip.driver) {
            await createNotificationSafe({
                title: 'Refusal Request Submitted',
                message: `Your refusal request for ${trip.jobId || trip.tripId} is pending admin review.`,
                type: 'system',
                link: '/trips',
                driverId: trip.driver
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Trip refusal request submitted successfully'
        });

    } catch (error) {
        console.error('Refuse trip error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to submit trip refusal',
            details: error.message
        });
    }
});

/**
 * POST /api/trips/:tripId/refuse/approve
 * Admin approves a refusal request and reassigns the trip to a new driver.
 */
router.post('/:tripId/refuse/approve', async (req, res) => {
    try {
        const { newDriverId } = req.body;
        if (!newDriverId) {
            return res.status(400).json({ success: false, error: 'newDriverId is required to reassign the trip' });
        }

        const trip = await findTripByIdentifier(req.params.tripId);

        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }

        const Driver = require('../models/driver.model');
        const Notification = require('../models/notification.model');

        const oldDriverId = trip.driver;

        // Free up the old Driver
        if (oldDriverId) {
            await Driver.findByIdAndUpdate(oldDriverId, {
                status: 'available',
                $unset: { currentTrip: 1, currentVehicle: 1 }
            });
        }

        // Assign the new driver
        await Driver.findByIdAndUpdate(newDriverId, {
            status: 'on-trip',
            currentTrip: trip._id,
            currentVehicle: trip.vehicle
        });

        // Update the Trip document with the new driver and reset refusal state
        trip.driver = newDriverId;
        trip.refusalRequest = {
            requested: false,
            reason: '',
            status: 'pending' // reset to default
        };
        await trip.save();

        if (oldDriverId) {
            // Notify the old driver that their refusal was approved
            await createNotificationSafe({
                title: 'Trip Refusal Reassigned',
                message: `Your refusal for ${trip.jobId || trip.tripId} was approved. The trip has been reassigned to another driver.`,
                type: 'trip_refused',
                driverId: oldDriverId
            });
        }

        // Notify new driver about reassigned trip.
        await createNotificationSafe({
            title: 'New Reassigned Trip',
            message: `Trip ${trip.jobId || trip.tripId} has been assigned to you.`,
            type: 'system',
            link: '/trips',
            driverId: newDriverId
        });

        return res.status(200).json({
            success: true,
            message: 'Trip refusal approved. Trip reassigned successfully.'
        });

    } catch (error) {
        console.error('Approve trip refusal error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to approve trip refusal',
            details: error.message
        });
    }
});

/**
 * POST /api/trips/:tripId/refuse/reject
 * Admin rejects a refusal request. This resets the refusal status to 'rejected' and the driver is expected to complete the trip.
 */
router.post('/:tripId/refuse/reject', async (req, res) => {
    try {
        const trip = await findTripByIdentifier(req.params.tripId);

        if (!trip) {
            return res.status(404).json({ success: false, error: 'Trip not found' });
        }

        const Notification = require('../models/notification.model');

        // Set the refusal request to rejected so the driver knows they must complete it
        trip.refusalRequest = {
            requested: false,
            reason: '',
            status: 'rejected'
        };

        await trip.save();

        if (trip.driver) {
            await createNotificationSafe({
                title: 'Trip Refusal Denied',
                message: `Your refusal for ${trip.jobId || trip.tripId} was denied by dispatch. You are required to complete this trip.`,
                type: 'system',
                driverId: trip.driver
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Trip refusal rejected. Trip will remain assigned to the driver.'
        });

    } catch (error) {
        console.error('Reject trip refusal error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to reject trip refusal',
            details: error.message
        });
    }
});

module.exports = router;
