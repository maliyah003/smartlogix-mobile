const admin = require('firebase-admin');

/**
 * Firebase Service
 * Handles real-time data synchronization with Firebase Realtime Database
 * Pushes trip updates to drivers instantly
 * 
 * NOTE: Firebase is OPTIONAL for development. Server will run without it.
 */

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Call this once during server startup
 * If credentials are not configured, skips initialization gracefully
 */
function initializeFirebase() {
    if (firebaseInitialized) {
        return;
    }

    //Check if Firebase credentials are properly configured
    const hasCredentials = process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY &&
        process.env.FIREBASE_DATABASE_URL &&
        process.env.FIREBASE_PROJECT_ID !== 'YOUR_FIREBASE_PROJECT_ID' &&
        !process.env.FIREBASE_PRIVATE_KEY.includes('YOUR_FIREBASE');

    if (!hasCredentials) {
        console.warn('\n Firebase credentials not configured in .env file');
        console.warn('   Running in DEVELOPMENT MODE without real-time features');
        console.warn('   To enable Firebase: Add credentials to backend/.env\n');
        firebaseInitialized = false;
        return; // Skip Firebase, don't throw error
    }

    try {
        // Initialize with service account credentials
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            }),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });

        firebaseInitialized = true;
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error.message);
        console.warn('Running without Firebase. Real-time features disabled.\n');
        firebaseInitialized = false;
        // Don't throw - allow server to continue
    }
}

/**
 * Push trip data to Firebase for real-time driver access
 * @param {Object} trip - Trip object (populated)
 * @param {Object} vehicle - Vehicle object
 * @param {Object} primaryJob - Primary job object
 * @param {Object} backhaulJob - Optional backhaul job
 * @param {Object} route - Route object
 * @returns {Promise<void>}
 */
async function pushTripToFirebase(trip, vehicle, primaryJob, backhaulJob, route) {
    if (!firebaseInitialized) {
        initializeFirebase();
    }

    // If Firebase is not initialized, skip silently
    if (!firebaseInitialized) {
        console.log('⏭️  Skipping Firebase push (Firebase not configured)');
        return;
    }

    const db = admin.database();
    const tripRef = db.ref(`trips/${trip.tripId}`);

    // Prepare trip data for Firebase
    const tripData = {
        tripId: trip.tripId,
        status: trip.status,

        // Vehicle information
        vehicle: {
            registrationNumber: vehicle.registrationNumber,
            type: vehicle.vehicleType
        },

        // Route information
        route: {
            coordinates: route.coordinates,
            distance: route.distance,
            duration: route.duration,
            estimatedFuelCost: route.estimatedFuelCost,
            polyline: route.polyline
        },

        // Primary job
        primaryJob: {
            jobId: primaryJob.jobId,
            cargo: primaryJob.cargo,
            pickup: {
                address: primaryJob.pickup.address,
                coordinates: primaryJob.pickup.location.coordinates,
                datetime: primaryJob.pickup.datetime.toISOString(),
                contact: primaryJob.pickup.contactName || primaryJob.customer?.name
            },
            delivery: {
                address: primaryJob.delivery.address,
                coordinates: primaryJob.delivery.location.coordinates,
                datetime: primaryJob.delivery.datetime.toISOString(),
                contact: primaryJob.delivery.contactName
            },
            specialInstructions: primaryJob.specialInstructions || null
        },

        // Backhaul job (if exists)
        backhaulJob: backhaulJob ? {
            jobId: backhaulJob.jobId,
            cargo: backhaulJob.cargo,
            pickup: {
                address: backhaulJob.pickup.address,
                coordinates: backhaulJob.pickup.location.coordinates,
                datetime: backhaulJob.pickup.datetime.toISOString(),
                contact: backhaulJob.pickup.contactName || backhaulJob.customer?.name
            },
            delivery: {
                address: backhaulJob.delivery.address,
                coordinates: backhaulJob.delivery.location.coordinates,
                datetime: backhaulJob.delivery.datetime.toISOString(),
                contact: backhaulJob.delivery.contactName
            },
            specialInstructions: backhaulJob.specialInstructions || null
        } : null,

        // Metadata
        createdAt: trip.createdAt.toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        await tripRef.set(tripData);
        console.log(`Trip ${trip.tripId} pushed to Firebase`);
    } catch (error) {
        console.error('Firebase push error:', error.message);
        // Don't throw - Firebase failure shouldn't break booking
    }
}

/**
 * Update trip status in Firebase
 * @param {String} tripId 
 * @param {String} status - 'scheduled' | 'active' | 'completed' | 'cancelled'
 * @returns {Promise<void>}
 */
async function updateTripStatus(tripId, status) {
    if (!firebaseInitialized) {
        initializeFirebase();
    }

    if (!firebaseInitialized) {
        console.log('⏭️  Skipping Firebase status update (Firebase not configured)');
        return;
    }

    const db = admin.database();
    const tripRef = db.ref(`trips/${tripId}`);

    try {
        await tripRef.update({
            status: status,
            updatedAt: new Date().toISOString()
        });
        console.log(`Trip ${tripId} status updated to ${status}`);
    } catch (error) {
        console.error('Firebase update error:', error.message);
        // Don't throw
    }
}

/**
 * Update driver's current position in real-time
 * @param {String} tripId 
 * @param {Number} longitude 
 * @param {Number} latitude 
 * @returns {Promise<void>}
 */
async function updateDriverPosition(tripId, longitude, latitude) {
    if (!firebaseInitialized) {
        initializeFirebase();
    }

    if (!firebaseInitialized) {
        return; // Silently skip
    }

    const db = admin.database();
    const positionRef = db.ref(`trips/${tripId}/currentPosition`);

    try {
        await positionRef.set({
            coordinates: [longitude, latitude],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Position update error:', error.message);
    }
}

/**
 * Delete trip from Firebase (cleanup after completion)
 * @param {String} tripId 
 * @returns {Promise<void>}
 */
async function deleteTripFromFirebase(tripId) {
    if (!firebaseInitialized) {
        return;
    }

    const db = admin.database();
    const tripRef = db.ref(`trips/${tripId}`);

    try {
        await tripRef.remove();
        console.log(`Trip ${tripId} removed from Firebase`);
    } catch (error) {
        console.error('Firebase delete error:', error.message);
    }
}

/**
 * Send notification to driver about new trip
 * @param {String} driverToken - FCM device token
 * @param {String} tripId 
 * @param {String} message 
 * @returns {Promise<void>}
 */
async function sendDriverNotification(driverToken, tripId, message) {
    if (!firebaseInitialized) {
        return;
    }

    const notificationMessage = {
        token: driverToken,
        notification: {
            title: 'New Trip Assignment',
            body: message
        },
        data: {
            tripId: tripId,
            type: 'trip_assignment'
        }
    };

    try {
        const response = await admin.messaging().send(notificationMessage);
        console.log('Notification sent successfully:', response);
    } catch (error) {
        console.error('FCM notification error:', error.message);
    }
}

/**
 * Archive completed trip (move to archive node)
 * @param {String} tripId 
 * @returns {Promise<void>}
 */
async function archiveTrip(tripId) {
    if (!firebaseInitialized) {
        return;
    }

    const db = admin.database();
    const tripRef = db.ref(`trips/${tripId}`);
    const archiveRef = db.ref(`archive/${tripId}`);

    try {
        const snapshot = await tripRef.once('value');
        const tripData = snapshot.val();

        if (tripData) {
            // Move to archive
            await archiveRef.set({
                ...tripData,
                archivedAt: new Date().toISOString()
            });

            // Delete from active trips
            await tripRef.remove();
            console.log(`Trip ${tripId} archived`);
        }
    } catch (error) {
        console.error('Archive error:', error.message);
    }
}

/**
 * Update Customer Note (Special Instructions) in Firebase
 * @param {String} tripId 
 * @param {String} jobType - 'primaryJob' or 'backhaulJob'
 * @param {String} note - The updated customer note
 * @returns {Promise<void>}
 */
async function updateCustomerNoteFirebase(tripId, jobType, note) {
    if (!firebaseInitialized) {
        initializeFirebase();
    }
    if (!firebaseInitialized) return;

    const db = admin.database();
    const ref = db.ref(`trips/${tripId}/${jobType}`);

    try {
        await ref.update({
            specialInstructions: note || null
        });
        console.log(`Updated ${jobType} note for Trip ${tripId} in Firebase`);
    } catch (error) {
        console.error('Firebase note update error:', error.message);
    }
}

module.exports = {
    initializeFirebase,
    pushTripToFirebase,
    updateTripStatus,
    updateDriverPosition,
    deleteTripFromFirebase,
    sendDriverNotification,
    archiveTrip,
    updateCustomerNoteFirebase
};
