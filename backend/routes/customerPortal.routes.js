const express = require('express');
const router = express.Router();
const Job = require('../models/job.model');
const Trip = require('../models/trip.model');
const Notification = require('../models/notification.model');
const firebaseService = require('../services/firebase.service');

/**
 * GET /api/customer-portal/track/:jobId
 * Get job details by ID for tracking (Public endpoint)
 */
router.get('/track/:jobId', async (req, res) => {
    try {
        const job = await Job.findOne({ jobId: req.params.jobId })
            .populate('assignedVehicle', 'registrationNumber vehicleType')
            .populate({
                path: 'assignedTrip',
                select: 'tripId status driver route currentPosition',
                populate: {
                    path: 'driver',
                    select: 'name contactNumber'
                }
            });

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Shipment not found'
            });
        }

        return res.status(200).json({
            success: true,
            job: job
        });

    } catch (error) {
        console.error('Customer tracking error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve tracking data',
            details: error.message
        });
    }
});

/**
 * PATCH /api/customer-portal/notes/:jobId
 * Update or delete a customer delivery note (specialInstructions)
 */
router.patch('/notes/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { note } = req.body;

        const job = await Job.findOne({ jobId: jobId });
        if (!job) {
            return res.status(404).json({ success: false, error: 'Job not found' });
        }

        job.specialInstructions = note || '';
        await job.save();

        if (job.assignedTrip) {
            const trip = await Trip.findById(job.assignedTrip).populate('driver');
            if (trip) {
                const isPrimary = trip.primaryJob.toString() === job._id.toString();
                const jobType = isPrimary ? 'primaryJob' : 'backhaulJob';

                await firebaseService.updateCustomerNoteFirebase(trip.tripId, jobType, job.specialInstructions);

                if (trip.driver && trip.status !== 'completed' && trip.status !== 'cancelled') {
                    const noticeText = note ? `Customer added a delivery note for ${jobId}` : `Customer removed the delivery note for ${jobId}`;
                    await Notification.create({
                        title: 'Delivery Note Updated',
                        message: noticeText,
                        type: 'customer_note',
                        driverId: trip.driver._id,
                        link: `/trips/${trip.tripId}`
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            job: job,
            message: 'Note updated successfully'
        });

    } catch (error) {
        console.error('Customer note update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update delivery note' });
    }
});

module.exports = router;
