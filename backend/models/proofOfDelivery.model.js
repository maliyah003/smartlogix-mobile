const mongoose = require('mongoose');

/**
 * Proof of delivery — one record per trip (delivery photo + customer signature).
 * Linked to Trip via `trip` ObjectId; resolve API calls using Trip.tripId (string).
 */
const proofOfDeliverySchema = new mongoose.Schema(
    {
        trip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trip',
            required: true,
            unique: true
        },
        deliveryPhotoBase64: {
            type: String,
            required: true
        },
        customerSignatureBase64: {
            type: String,
            required: true
        },
        recordedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('ProofOfDelivery', proofOfDeliverySchema);
