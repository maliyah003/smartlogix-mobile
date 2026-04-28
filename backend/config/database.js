const mongoose = require('mongoose');

/**
 * MongoDB Database Configuration
 * Connects to MongoDB with proper error handling
 */

const connectDatabase = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartlogix';

        const options = {
            // Use new URL parser
            useNewUrlParser: true,
            useUnifiedTopology: true,

            // Connection pool settings
            maxPoolSize: 10,
            minPoolSize: 2,

            // Timeout settings and IPv4 fallback
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4 // Force IPv4 to prevent IPv6 DNS routing issues
        };

        const conn = await mongoose.connect(mongoURI, options);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`Database: ${conn.connection.name}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDatabase;
