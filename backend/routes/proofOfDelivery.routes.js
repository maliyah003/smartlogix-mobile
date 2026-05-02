const express = require('express');
const router = express.Router();
const Trip = require('../models/trip.model');
const ProofOfDelivery = require('../models/proofOfDelivery.model');
const sharp = require('sharp');

const MAX_PHOTO_LEN = 12 * 1024 * 1024;
const MAX_SIG_LEN = 2 * 1024 * 1024;

function toRawBase64(input) {
    if (!input) return '';
    const s = String(input).trim();
    const m = /^data:image\/\w+;base64,(.+)$/i.exec(s);
    return m ? m[1] : s;
}

async function compressImageBase64(rawBase64, { width = 1280, quality = 70 } = {}) {
    const source = Buffer.from(rawBase64, 'base64');
    const compressed = await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    return compressed.toString('base64');
}

/**
 * GET /api/proof-of-delivery
 * List recent proof-of-delivery records for admin dashboard.
 */
router.get('/', async (req, res) => {
    try {
        const limitRaw = Number(req.query.limit);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;

        const proofs = await ProofOfDelivery.find()
            .populate({
                path: 'trip',
                select: 'tripId status primaryJob driver vehicle completedAt',
                populate: [
                    { path: 'primaryJob', select: 'jobId pickup delivery' },
                    { path: 'driver', select: 'name email' },
                    { path: 'vehicle', select: 'registrationNumber model' }
                ]
            })
            .sort({ recordedAt: -1 })
            .limit(limit);

        return res.status(200).json({
            success: true,
            count: proofs.length,
            proofs
        });
    } catch (error) {
        console.error('List proof of delivery error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch proof of delivery records',
            details: error.message
        });
    }
});

/**
 * PATCH /api/proof-of-delivery/trip/:tripId
 * Upsert proof of delivery for the trip identified by Trip.tripId (e.g. TRIP-2026-0001).
 */
router.patch('/trip/:tripId', async (req, res) => {
    try {
        const { deliveryPhotoBase64, customerSignatureBase64 } = req.body;

        if (!deliveryPhotoBase64 || !customerSignatureBase64) {
            return res.status(400).json({
                success: false,
                error: 'deliveryPhotoBase64 and customerSignatureBase64 are required'
            });
        }

        const rawPhoto = toRawBase64(deliveryPhotoBase64);
        const rawSignature = toRawBase64(customerSignatureBase64);

        if (
            rawPhoto.length > MAX_PHOTO_LEN ||
            rawSignature.length > MAX_SIG_LEN
        ) {
            return res.status(400).json({
                success: false,
                error: 'Proof payload is too large'
            });
        }

        let compressedPhotoBase64;
        let compressedSignatureBase64;
        try {
            compressedPhotoBase64 = await compressImageBase64(rawPhoto, { width: 1280, quality: 70 });
            compressedSignatureBase64 = await compressImageBase64(rawSignature, { width: 700, quality: 65 });
        } catch (imgErr) {
            return res.status(400).json({
                success: false,
                error: 'Invalid image payload for proof of delivery',
                details: imgErr.message
            });
        }

        const trip = await Trip.findOne({
            $or: [{ tripId: req.params.tripId }, { jobId: req.params.tripId }]
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        const recordedAt = new Date();

        const proofOfDelivery = await ProofOfDelivery.findOneAndUpdate(
            { trip: trip._id },
            {
                trip: trip._id,
                deliveryPhotoBase64: compressedPhotoBase64,
                customerSignatureBase64: compressedSignatureBase64,
                recordedAt
            },
            { upsert: true, new: true, runValidators: true }
        ).populate('trip', 'tripId status primaryJob');

        return res.status(200).json({
            success: true,
            message: 'Proof of delivery saved',
            proofOfDelivery
        });
    } catch (error) {
        console.error('Proof of delivery error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save proof of delivery',
            details: error.message
        });
    }
});

/**
 * GET /api/proof-of-delivery/trip/:tripId
 * Fetch proof of delivery for a trip (by Trip.tripId string).
 */
router.get('/trip/:tripId', async (req, res) => {
    try {
        const trip = await Trip.findOne({
            $or: [{ tripId: req.params.tripId }, { jobId: req.params.tripId }]
        }).select('_id tripId jobId');

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip not found'
            });
        }

        const proofOfDelivery = await ProofOfDelivery.findOne({ trip: trip._id }).populate(
            'trip',
            'tripId status primaryJob driver vehicle'
        );

        if (!proofOfDelivery) {
            return res.status(404).json({
                success: false,
                error: 'Proof of delivery not found for this trip'
            });
        }

        return res.status(200).json({
            success: true,
            proofOfDelivery
        });
    } catch (error) {
        console.error('Get proof of delivery error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch proof of delivery',
            details: error.message
        });
    }
});

module.exports = router;
