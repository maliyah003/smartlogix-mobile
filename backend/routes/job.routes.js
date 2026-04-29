const express = require('express');
const router = express.Router();
const Job = require('../models/job.model');
const Vehicle = require('../models/vehicle.model');
const Trip = require('../models/trip.model');
const Notification = require('../models/notification.model');
const loadMatcher = require('../services/loadMatcher.service');
const backhaulFinder = require('../services/backhaulFinder.service');
const routeOptimizer = require('../services/routeOptimizer.service');
const manifestGenerator = require('../services/manifestGenerator.service');
const firebaseService = require('../services/firebase.service');
const jobBookingService = require('../services/jobBooking.service');

/**
 * POST /api/jobs/book
 * Book a new job with automatic vehicle matching and backhaul coordination
 */
router.post('/book', async (req, res) => {
    const result = await jobBookingService.bookNewJob(req.body);
    return res.status(result.status || 500).json(result.payload);
});

/**
 * GET /api/jobs/backhaul
 * Find backhaul opportunities near a location
 * Query params: lat, lng, vehicleId, radius (optional)
 */
router.get('/backhaul', async (req, res) => {
    try {
        const { lat, lng, vehicleId, radius } = req.query;

        // Validate required params
        if (!lat || !lng || !vehicleId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: lat, lng, vehicleId'
            });
        }

        // Get vehicle capacity
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }

        // Search for backhaul opportunities
        const coordinates = [parseFloat(lng), parseFloat(lat)];
        const searchRadius = radius ? parseInt(radius) * 1000 : 50000; // Convert km to meters (default 50km)

        let availableFromDate = new Date(); // From now
        if (req.query.availableFrom) {
            const parsedDate = new Date(req.query.availableFrom);
            if (!isNaN(parsedDate.getTime())) {
                availableFromDate = parsedDate;
            }
        }

        const opportunities = await backhaulFinder.findBackhaulByLocation(
            coordinates,
            vehicle.capacity,
            availableFromDate,
            searchRadius
        );

        return res.status(200).json({
            success: true,
            count: opportunities.length,
            searchLocation: {
                latitude: parseFloat(lat),
                longitude: parseFloat(lng)
            },
            searchRadius: `${searchRadius / 1000} km`,
            vehicle: {
                registrationNumber: vehicle.registrationNumber,
                capacity: vehicle.capacity
            },
            opportunities: opportunities
        });

    } catch (error) {
        console.error('Backhaul search error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to search for backhaul opportunities',
            details: error.message
        });
    }
});


/**
 * GET /api/jobs
 * Get all jobs with optional filtering
 * Query params: status, limit, skip
 */
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, skip = 0 } = req.query;

        const filter = status ? { status } : {};

        const jobs = await Job.find(filter)
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .sort({ createdAt: -1 })
            .populate('assignedVehicle', 'registrationNumber vehicleType')
            .populate({
                path: 'assignedTrip',
                select: 'tripId status driver route',
                populate: {
                    path: 'driver',
                    select: 'name contactNumber'
                }
            });

        const total = await Job.countDocuments(filter);

        return res.status(200).json({
            success: true,
            count: jobs.length,
            total: total,
            jobs: jobs
        });

    } catch (error) {
        console.error('Get jobs error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve jobs',
            details: error.message
        });
    }
});

/**
 * POST /api/jobs/match
 * Get vehicle matches for a hypothetical job (without creating it)
 */
router.post('/match', async (req, res) => {
    try {
        const { cargo, pickup, delivery } = req.body;

        if (!cargo || !pickup || !delivery) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: cargo, pickup, delivery'
            });
        }

        const matches = await loadMatcher.getAllMatchedVehicles({
            cargo: cargo,
            pickup: pickup,
            delivery: delivery
        });

        return res.status(200).json({
            success: true,
            count: matches.length,
            bestMatch: matches[0] || null,
            allMatches: matches
        });

    } catch (error) {
        console.error('Vehicle matching error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to find vehicle matches',
            details: error.message
        });
    }
});


module.exports = router;
