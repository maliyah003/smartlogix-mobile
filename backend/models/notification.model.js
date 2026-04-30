const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['trip_started', 'trip_completed', 'trip_refused', 'system', 'customer_note'],
        required: true
    },
    link: {
        type: String, // route URL (e.g., /trips or /refusals)
        default: null
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 30 * 24 * 60 * 60 // Optional: auto-delete after 30 days
    }
});

// Create an index to quickly find unread notifications
notificationSchema.index({ isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
