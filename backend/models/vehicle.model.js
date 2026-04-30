const mongoose = require('mongoose');

/**
 * Vehicle Schema
 * Tracks fleet vehicles with capacity, location, and availability status
 * Uses GeoJSON for geospatial queries (proximity searches for load matching)
 */
const vehicleSchema = new mongoose.Schema({
    registrationNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },

    vehicleType: {
        type: String,
        required: true,
        enum: ['truck', 'van', 'Truck', 'Van', 'lorry', 'mini-truck', 'flatbed'],
        default: 'truck'
    },

    capacity: {
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
        }
    },

    // GeoJSON Point format for MongoDB geospatial queries
    currentLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            validate: {
                validator: function (coords) {
                    // Validate longitude (-180 to 180) and latitude (-90 to 90)
                    return coords.length === 2 &&
                        coords[0] >= -180 && coords[0] <= 180 &&
                        coords[1] >= -90 && coords[1] <= 90;
                },
                message: 'Invalid coordinates format. Use [longitude, latitude]'
            }
        }
    },

    status: {
        type: String,
        /**
         * Vehicle operational status (not trip occupancy).
         * Legacy values are kept for backwards compatibility with existing DB records.
         */
        enum: [
            'Active',
            'In Maintenance',
            'Out of Service',
            // legacy
            'available',
            'in-transit',
            'maintenance',
            'offline'
        ],
        default: 'Active'
    },

    // Driver information (optional - can be expanded later)
    driver: {
        name: String,
        contactNumber: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^(?:0|\+94)[1-9]\d{8}$/.test(v);
                },
                message: props => `${props.value} is not a valid Sri Lankan phone number! Must be 10 digits starting with 0 or in +94 format.`
            }
        },
        licenseNumber: String
    },

    // Predictive Maintenance fields
    usageHours: {
        type: Number,
        default: 0
    },
    /** Increments on each completed trip; ML prediction runs when this count is a multiple of 5 (see predictiveMaintenance.service). */
    tripsSinceMaintenancePrediction: {
        type: Number,
        default: 0,
        min: 0
    },
    serviceRecords: [{
        date: { type: Date, required: true },
        description: { type: String, required: true }
    }],

    // Vehicle Details
    model: {
        type: String,
        required: false,
        trim: true
    },

    // License & Papers
    licenseStartDate: Date,
    licenseEndDate: Date,
    insuranceStartDate: Date,
    insuranceEndDate: Date,

    // Fuel efficiency for cost calculations (km per liter)
    fuelConsumption: {
        type: Number,
        default: 8, // Target KPL
        min: 0
    },

    // Reset date for fuel consistency tracking
    fuelConsistencyResetAt: {
        type: Date,
        default: null
    },

    // Metadata
    lastUpdated: {
        type: Date,
        default: Date.now
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Create 2dsphere index on currentLocation for geospatial queries
vehicleSchema.index({ currentLocation: '2dsphere' });

// Index on status for fast filtering of available vehicles
vehicleSchema.index({ status: 1 });

// Compound index for common queries (status + location)
vehicleSchema.index({ status: 1, currentLocation: '2dsphere' });

/**
 * Update vehicle location
 * @param {Number} longitude 
 * @param {Number} latitude 
 */
vehicleSchema.methods.updateLocation = function (longitude, latitude) {
    this.currentLocation = {
        type: 'Point',
        coordinates: [longitude, latitude]
    };
    this.lastUpdated = Date.now();
    return this.save();
};

/**
 * Check if vehicle can carry the cargo
 * @param {Number} cargoWeight - Weight in kg
 * @param {Number} cargoVolume - Volume in cubic meters
 * @returns {Boolean}
 */
vehicleSchema.methods.canCarry = function (cargoWeight, cargoVolume) {
    return this.capacity.weight >= cargoWeight &&
        this.capacity.volume >= cargoVolume;
};

/**
 * Calculate capacity utilization percentage
 * @param {Number} cargoWeight 
 * @param {Number} cargoVolume 
 * @returns {Object} { weight: %, volume: % }
 */
vehicleSchema.methods.calculateUtilization = function (cargoWeight, cargoVolume) {
    return {
        weight: (cargoWeight / this.capacity.weight) * 100,
        volume: (cargoVolume / this.capacity.volume) * 100
    };
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
