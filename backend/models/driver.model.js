const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^(?:0|\+94)[1-9]\d{8}$/.test(v);
            },
            message: props => `${props.value} is not a valid Sri Lankan phone number! Must be 10 digits starting with 0 or in +94 format.`
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        default: null
    },
    experienceLevel: {
        type: String,
        enum: ['Junior', 'Mid-Level', 'Senior', 'Expert'],
        default: 'Junior'
    },
    safetyScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['available', 'on-trip', 'off-duty'],
        default: 'available'
    },
    currentVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null
    },
    currentTrip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Driver', driverSchema);
