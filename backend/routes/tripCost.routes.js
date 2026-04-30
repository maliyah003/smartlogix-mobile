const express = require('express');
const router = express.Router();
const tripCostService = require('../services/tripCost.service');

// POST /api/trip-costs/start
router.post('/start', async (req, res) => {
    try {
        const { tripId, driverId, startOdometer } = req.body;
        if (!tripId || !driverId || startOdometer === undefined) {
            return res.status(400).json({ success: false, error: 'tripId, driverId, and startOdometer are required' });
        }

        const tripCost = await tripCostService.saveStartOdometer(tripId, driverId, startOdometer);
        res.status(201).json({ success: true, tripCost });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// POST /api/trip-costs/draft
router.post('/draft', async (req, res) => {
    try {
        const { tripId, ...updateData } = req.body;
        if (!tripId) {
            return res.status(400).json({ success: false, error: 'tripId is required' });
        }

        const tripCost = await tripCostService.saveDraft(tripId, updateData);
        res.json({ success: true, tripCost });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE /api/trip-costs/:tripId/draft
router.delete('/:tripId/draft', async (req, res) => {
    try {
        const { tripId } = req.params;
        const tripCost = await tripCostService.resetDraft(tripId);
        res.json({ success: true, tripCost });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// POST /api/trip-costs/finalize
router.post('/finalize', async (req, res) => {
    try {
        const { tripId, ...updateData } = req.body;
        if (!tripId) {
            return res.status(400).json({ success: false, error: 'tripId is required' });
        }

        const tripCost = await tripCostService.finalizeTripCost(tripId, updateData);
        res.json({ success: true, tripCost });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// GET /api/trip-costs/admin/daily-consistency
router.get('/admin/daily-consistency', async (req, res) => {
    try {
        const report = await tripCostService.getDailyVehicleConsistency();
        res.json({ success: true, report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/trip-costs/admin/reset-consistency/:registrationNumber
router.post('/admin/reset-consistency/:registrationNumber', async (req, res) => {
    try {
        const { registrationNumber } = req.params;
        await tripCostService.resetFuelConsistency(registrationNumber);
        res.json({ success: true, message: `Fuel consistency reset for vehicle ${registrationNumber}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/trip-costs/summary
router.get('/summary', async (req, res) => {
    try {
        const costs = await tripCostService.getAllTripCosts();
        res.json({ success: true, count: costs.length, costs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/trip-costs/:tripId
router.get('/:tripId', async (req, res) => {
    try {
        const { tripId } = req.params;
        const tripCost = await tripCostService.getTripCost(tripId);
        if (!tripCost) return res.status(404).json({ success: false, error: 'Trip cost not found' });
        res.json({ success: true, tripCost });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
