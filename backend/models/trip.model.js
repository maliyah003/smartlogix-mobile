const mongoose = require('mongoose');

/**
 * Trip Schema
 * Represents a complete trip with optimized route, digital manifest, and economics
 * Links primary job with optional backhaul job
 */
const tripSchema = new mongoose.Schema({
    tripId: {
        type: String,
        unique: true,
        // Auto-generated in pre-validate hook: TRIP-YYYY-NNNN
    },
    // Soft migration path: public-facing trip identity mirrors the primary jobId.
    jobId: {
        type: String,
        index: true,
    },

    // Vehicle assigned to this trip
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    },

    // Primary job (main delivery)
    primaryJob: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true
    },

    // Backhaul job (return load - optional)
    backhaulJob: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        default: null
    },

    // Optimized route from Google Maps
    route: {
        // Array of waypoint coordinates [[lng, lat], ...]
        coordinates: {
            type: [[Number]],
            required: true
        },

        // Total distance in meters
        distance: {
            type: Number,
            required: true,
            min: 0
        },

        // Total duration in seconds
        duration: {
            type: Number,
            required: true,
            min: 0
        },

        // Encoded polyline (Google Maps format)
        polyline: String,

        // Estimated fuel cost (LKR)
        estimatedFuelCost: {
            type: Number,
            min: 0
        },

        // Waypoint order (primary pickup, primary delivery, backhaul pickup, backhaul delivery)
        waypointOrder: [String]
    },

    // Digital Manifest (comprehensive trip document - stored as flexible object)
    manifest: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },

    status: {
        type: String,
        enum: ['scheduled', 'active', 'completed', 'cancelled'],
        default: 'scheduled'
    },

    // Trip Refusal Feature
    refusalRequest: {
        requested: {
            type: Boolean,
            default: false
        },
        reason: {
            type: String,
            trim: true
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        }
    },

    // Actual trip times (tracked in real-time)
    actualTimes: {
        startTime: Date,
        endTime: Date,
        primaryPickupTime: Date,
        primaryDeliveryTime: Date,
        backhaulPickupTime: Date,
        backhaulDeliveryTime: Date
    },

    // Real-time tracking
    currentPosition: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number], // [longitude, latitude]
        timestamp: Date
    },

    // Trip notes and issues
    notes: {
        type: String,
        trim: true
    },

    // Driver feedback
    driverFeedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comments: String
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    completedAt: Date
}, {
    timestamps: true
});

// Indexes
tripSchema.index({ tripId: 1 });
tripSchema.index({ jobId: 1 });
tripSchema.index({ vehicle: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ createdAt: -1 }); // For recent trips queries

/**
 * Pre-validate hook to generate tripId
 * Uses pre-validate instead of pre-save to ensure tripId exists before validation
 */
tripSchema.pre('validate', async function (next) {
    if (!this.tripId) {
        const year = new Date().getFullYear();
        const count = await mongoose.model('Trip').countDocuments();
        this.tripId = `TRIP-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    if (!this.jobId && this.primaryJob) {
        const primaryJob = await mongoose.model('Job').findById(this.primaryJob).select('jobId');
        if (primaryJob?.jobId) {
            this.jobId = primaryJob.jobId;
        }
    }
    next();
});

/**
 * Calculate empty miles reduction percentage
 * @returns {String} Percentage as string (e.g., "65%")
 */
tripSchema.methods.calculateEmptyMilesReduction = function () {
    if (!this.backhaulJob) {
        return "0%";
    }

    // With backhaul, we eliminate the return journey distance
    // Assume return distance ≈ primary job distance
    const totalDistance = this.route.distance;
    const estimatedReturnDistance = totalDistance / 2; // Rough estimate
    const reduction = (estimatedReturnDistance / totalDistance) * 100;

    return `${Math.round(reduction)}%`;
};

/**
 * Calculate total revenue from all jobs
 * @returns {Number} Total revenue in LKR
 */
tripSchema.methods.calculateTotalRevenue = async function () {
    await this.populate('primaryJob backhaulJob');

    let revenue = 0;
    if (this.primaryJob && this.primaryJob.pricing) {
        revenue += this.primaryJob.pricing.finalPrice || this.primaryJob.pricing.quotedPrice || 0;
    }
    if (this.backhaulJob && this.backhaulJob.pricing) {
        revenue += this.backhaulJob.pricing.finalPrice || this.backhaulJob.pricing.quotedPrice || 0;
    }

    return revenue;
};

/**
 * Update current position (for real-time tracking)
 * @param {Number} longitude 
 * @param {Number} latitude 
 */
tripSchema.methods.updatePosition = function (longitude, latitude) {
    this.currentPosition = {
        type: 'Point',
        coordinates: [longitude, latitude],
        timestamp: new Date()
    };
    return this.save();
};

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;
