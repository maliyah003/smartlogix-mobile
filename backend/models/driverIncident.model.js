const mongoose = require('mongoose');

/**
 * Driver Incident Schema
 * Stores verified/unverified incidents used by the driver scoring engine.
 * Score is computed per-month starting at 100, using these incidents + trip punctuality.
 */
const driverIncidentSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true,
        index: true
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        default: null
    },
    category: {
        type: String,
        required: true,
        enum: [
            'accident',
            'complaint',
            'delay',
            'missed_delivery',
            'vehicle_issue',
            'traffic_violation'
        ],
        index: true
    },
    severity: {
        type: String,
        required: true,
        enum: ['minor', 'moderate', 'major', 'valid', 'serious'],
        index: true
    },
    verified: {
        type: Boolean,
        default: false,
        index: true
    },
    /** Extra context for scoring (delay mins/reason, missed delivery reason, notes, etc.). */
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    occurredAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

driverIncidentSchema.index({ driver: 1, occurredAt: -1 });
driverIncidentSchema.index({ driver: 1, category: 1, occurredAt: -1 });

module.exports = mongoose.model('DriverIncident', driverIncidentSchema);

