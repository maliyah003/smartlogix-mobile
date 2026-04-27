require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDatabase = require('./config/database');
const firebaseService = require('./services/firebase.service');

// Import routes
const jobRoutes = require('./routes/job.routes');
const tripRoutes = require('./routes/trip.routes');
const vehicleRoutes = require('./routes/vehicle.routes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'SmartLogix API is running',
        timestamp: new Date().toISOString(),
        services: {
            database: 'MongoDB Connected',
            firebase: 'Firebase Initialized'
        }
    });
});

// API Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/customer-portal', require('./routes/customerPortal.routes'));
app.use('/api/drivers', require('./routes/driver.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/trip-costs', require('./routes/tripCost.routes'));
app.use('/api/proof-of-delivery', require('./routes/proofOfDelivery.routes'));

// Welcome route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to SmartLogix API',
        version: '1.0.0',
        component: 'Smart Job Booking & Route Optimizer',
        endpoints: {
            jobs: {
                'POST /api/jobs/book': 'Book a new job with automatic vehicle matching',
                'GET /api/jobs/backhaul': 'Find backhaul opportunities',
                'POST /api/jobs/match': 'Get vehicle matches for a job',
                'GET /api/jobs/:jobId': 'Get job details',
                'GET /api/jobs': 'List all jobs'
            },
            trips: {
                'GET /api/trips/:tripId': 'Get trip details',
                'PATCH /api/trips/:tripId/status': 'Update trip status',
                'POST /api/trips/:tripId/position': 'Update driver position'
            },
            vehicles: {
                'GET /api/vehicles': 'List all vehicles',
                'POST /api/vehicles': 'Create new vehicle',
                'GET /api/vehicles/:id': 'Get vehicle details',
                'PATCH /api/vehicles/:id/location': 'Update vehicle location',
                'PATCH /api/vehicles/:id/status': 'Update vehicle status'
            }
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Initialize services and start server
const PORT = process.env.PORT || 5003;

async function startServer() {
    try {
        // Connect to MongoDB
        await connectDatabase();

        // Initialize Firebase
        firebaseService.initializeFirebase();

        // Start Express server
        app.listen(PORT, () => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`SmartLogix API Server`);
            console.log(`Server running on port ${PORT}`);
            console.log(`API: http://localhost:${PORT}`);
            console.log(`Health: http://localhost:${PORT}/health`);
            console.log(`${'='.repeat(60)}\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
