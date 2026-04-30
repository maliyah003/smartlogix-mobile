const mongoose = require('mongoose');

const tripCostSchema = new mongoose.Schema({
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true,
        unique: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    startOdometer: {
        type: Number,
        required: true,
        min: 0
    },
    endOdometer: {
        type: Number,
        default: null
    },
    fuelPrice: {
        type: Number,
        default: null
    },
    litersRefilled: {
        type: Number,
        default: null
    },
    parkingFee: {
        type: Number,
        default: 0
    },
    tollFee: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'finalized'],
        default: 'draft'
    },
    calculations: {
        distance: { type: Number, default: 0 },
        fuelEfficiency: { type: Number, default: 0 },
        fuelCost: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TripCost', tripCostSchema);
