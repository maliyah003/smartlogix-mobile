const mongoose = require('mongoose');

/**
 * Job Schema
 * Represents a cargo booking request with pickup/delivery locations
 * GeoJSON format enables geospatial searches for backhaul coordination
 */
const jobSchema = new mongoose.Schema({
    jobId: {
        type: String,
        unique: true,
        // Auto-generated format: JOB-YYYY-NNNN (removed 'required' since pre-save hook generates it)
    },

    cargo: {
        weight: {
            type: Number,
            required: true,
            min: 0,
            // Weight in kilograms
        },
        volume: {
            type: Number,
            required: true,
            min: 0,
            // Volume in cubic meters
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        type: {
            type: String,
            enum: ['general', 'fragile', 'perishable', 'hazardous', 'oversized'],
            default: 'general'
        }
    },

    // Pickup location (GeoJSON Point)
    pickup: {
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true
            }
        },
        address: {
            type: String,
            required: true,
            trim: true
        },
        datetime: {
            type: Date,
            required: true
        },
        contactName: String,
        contactPhone: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^(?:0|\+94)[1-9]\d{8}$/.test(v);
                },
                message: props => `${props.value} is not a valid Sri Lankan phone number! Must be 10 digits starting with 0 or in +94 format.`
            }
        }
    },

    // Delivery location (GeoJSON Point)
    delivery: {
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true
            }
        },
        address: {
            type: String,
            required: true,
            trim: true
        },
        datetime: {
            type: Date,
            required: true
        },
        contactName: String,
        contactPhone: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^(?:0|\+94)[1-9]\d{8}$/.test(v);
                },
                message: props => `${props.value} is not a valid Sri Lankan phone number! Must be 10 digits starting with 0 or in +94 format.`
            }
        }
    },

    status: {
        type: String,
        enum: ['pending', 'assigned', 'in-transit', 'completed', 'cancelled'],
        default: 'pending'
    },

    // References to assigned vehicle and trip
    assignedVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },

    assignedTrip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        default: null
    },

    // Pricing (optional - can be calculated or provided)
    pricing: {
        quotedPrice: Number,
        finalPrice: Number,
        currency: {
            type: String,
            default: 'LKR' // Sri Lankan Rupees
        }
    },

    // Customer information
    customer: {
        name: String,
        phone: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^(?:0|\+94)[1-9]\d{8}$/.test(v);
                },
                message: props => `${props.value} is not a valid Sri Lankan phone number! Must be 10 digits starting with 0 or in +94 format.`
            }
        },
        email: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^\S+@\S+\.\S+$/.test(v);
                },
                message: props => `${props.value} is not a valid email address!`
            }
        },
        companyName: String
    },

    // Special instructions
    specialInstructions: {
        type: String,
        trim: true
    },

    // Job type (primary trip or backhaul)
    jobType: {
        type: String,
        enum: ['primary', 'backhaul'],
        default: 'primary'
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create 2dsphere indexes on both pickup and delivery locations
jobSchema.index({ 'pickup.location': '2dsphere' });
jobSchema.index({ 'delivery.location': '2dsphere' });

// Index on status for filtering pending jobs
jobSchema.index({ status: 1 });

// Compound index for backhaul searches (status + delivery location)
jobSchema.index({ status: 1, 'pickup.location': '2dsphere' });

// Index on jobId for fast lookups
jobSchema.index({ jobId: 1 });

/**
 * Pre-validate hook to generate jobId
 * Uses pre-validate instead of pre-save to ensure jobId exists before validation
 */
jobSchema.pre('validate', async function (next) {
    if (!this.jobId) {
        const year = new Date().getFullYear();
        // Generate a random 4-character string to append to the year, 
        // avoiding collision if jobs have been soft/hard deleted.
        const randomStr = Math.floor(1000 + Math.random() * 9000);
        this.jobId = `JOB-${year}-${randomStr}`;

        // Ensure it's unique by checking DB
        let isUnique = false;
        let count = 0;
        while (!isUnique && count < 5) {
            const existingJob = await mongoose.model('Job').findOne({ jobId: this.jobId });
            if (!existingJob) {
                isUnique = true;
            } else {
                const newRandomStr = Math.floor(1000 + Math.random() * 9000);
                this.jobId = `JOB-${year}-${newRandomStr}`;
            }
            count++;
        }
    }
    next();
});

/**
 * Calculate straight-line distance between pickup and delivery (in meters)
 * Uses Haversine formula
 * @returns {Number} Distance in meters
 */
jobSchema.methods.calculateDistance = function () {
    const [lon1, lat1] = this.pickup.location.coordinates;
    const [lon2, lat2] = this.delivery.location.coordinates;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

/**
 * Check if job is eligible for backhaul assignment
 * @param {Date} estimatedDeliveryTime - When primary job will be delivered
 * @returns {Boolean}
 */
jobSchema.methods.isEligibleForBackhaul = function (estimatedDeliveryTime) {
    // Job must be pending and pickup must be after delivery of primary job
    return this.status === 'pending' &&
        this.pickup.datetime >= estimatedDeliveryTime;
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
