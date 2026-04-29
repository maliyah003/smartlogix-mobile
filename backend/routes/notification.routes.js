const express = require('express');
const router = express.Router();
const Notification = require('../models/notification.model');

/**
 * GET /api/notifications
 * Fetch recent notifications (limited to last 50)
 */
router.get('/', async (req, res) => {
    try {
        const { driverId } = req.query;
        const query = driverId ? { driverId } : { driverId: null };

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

        return res.status(200).json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Fetch notifications error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve notifications'
        });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        return res.status(200).json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Update notification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update notification'
        });
    }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', async (req, res) => {
    try {
        const { driverId } = req.body;
        const query = { isRead: false };
        if (driverId) {
            query.driverId = driverId;
        } else {
            query.driverId = null;
        }

        await Notification.updateMany(
            query,
            { $set: { isRead: true } }
        );

        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Update all notifications error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update notifications'
        });
    }
});

module.exports = router;
