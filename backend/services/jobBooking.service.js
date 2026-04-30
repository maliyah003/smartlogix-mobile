const Job = require('../models/job.model');
const Vehicle = require('../models/vehicle.model');
const Trip = require('../models/trip.model');
const Driver = require('../models/driver.model');
const loadMatcher = require('./loadMatcher.service');
const backhaulFinder = require('./backhaulFinder.service');
const routeOptimizer = require('./routeOptimizer.service');
const manifestGenerator = require('./manifestGenerator.service');
const firebaseService = require('./firebase.service');
const emailService = require('./email.service');
const Notification = require('../models/notification.model');

/**
 * Orchestrates the full job booking process:
 * creates the job, assigns vehicle/driver, finds backhaul,
 * optimizes routes, generates manifests, and syncs with Firebase.
 *
 * @param {Object} bookingData - The request body payload from the route
 * @returns {Object} An object containing the final HTTP status and JSON response body
 */
exports.bookNewJob = async (bookingData) => {
    try {
        const { cargo, pickup, delivery, customer, pricing, specialInstructions } = bookingData;

        // Debug logging
        console.log('=== JOB BOOKING REQUEST ===');
        console.log('Pickup:', JSON.stringify(pickup, null, 2));
        console.log('Delivery:', JSON.stringify(delivery, null, 2));
        console.log('Cargo:', JSON.stringify(cargo, null, 2));

        // Validate required fields
        if (!cargo || !pickup || !delivery) {
            return {
                status: 400,
                payload: {
                    success: false,
                    error: 'Missing required fields: cargo, pickup, delivery'
                }
            };
        }

        // Step 1: Create the job
        const newJob = new Job({
            cargo: {
                weight: cargo.weight,
                volume: cargo.volume,
                description: cargo.description,
                type: cargo.type || 'general'
            },
            pickup: {
                location: {
                    type: 'Point',
                    coordinates: pickup.location.coordinates // Frontend sends pickup.location.coordinates
                },
                address: pickup.address,
                datetime: new Date(pickup.datetime),
                contactName: pickup.contactName,
                contactPhone: pickup.contactPhone
            },
            delivery: {
                location: {
                    type: 'Point',
                    coordinates: delivery.location.coordinates // Frontend sends delivery.location.coordinates
                },
                address: delivery.address,
                datetime: new Date(delivery.datetime),
                contactName: delivery.contactName,
                contactPhone: delivery.contactPhone
            },
            customer: customer || {},
            pricing: pricing || {},
            specialInstructions: specialInstructions || '',
            status: 'pending'
        });

        await newJob.save();

        // Step 2: Find vehicle (User Selected or Best Match)
        let bestVehicleMatch;
        const { vehicleId, driverId } = bookingData;

        try {
            if (vehicleId) {
                // User selected a specific vehicle
                const selectedVehicle = await Vehicle.findById(vehicleId);
                if (!selectedVehicle) {
                    return {
                        status: 404,
                        payload: {
                            success: false,
                            error: 'Selected vehicle not found'
                        }
                    };
                }

                // Do not allow assignment if vehicle is in maintenance / out of service (or legacy offline/maintenance)
                const blockedStatuses = new Set(['In Maintenance', 'Out of Service', 'maintenance', 'offline']);
                if (blockedStatuses.has(selectedVehicle.status)) {
                    return {
                        status: 400,
                        payload: {
                            success: false,
                            error: `Selected vehicle is not assignable (status: ${selectedVehicle.status}).`
                        }
                    };
                }

                // Compliance check: expired license/insurance vehicles are immediately out of service
                const now = new Date();
                const licenseExpired = selectedVehicle.licenseEndDate && new Date(selectedVehicle.licenseEndDate) < now;
                const insuranceExpired = selectedVehicle.insuranceEndDate && new Date(selectedVehicle.insuranceEndDate) < now;
                if (licenseExpired || insuranceExpired) {
                    selectedVehicle.status = 'Out of Service';
                    selectedVehicle.lastUpdated = now;
                    await selectedVehicle.save();
                    return {
                        status: 400,
                        payload: {
                            success: false,
                            error: 'Selected vehicle cannot be assigned because license or insurance is expired.'
                        }
                    };
                }

                // Construct a match object for the response structure
                bestVehicleMatch = {
                    vehicle: selectedVehicle,
                    score: 100,
                    breakdown: ['User Selected']
                };
            } else {
                // Automatic matching
                bestVehicleMatch = await loadMatcher.findBestVehicle({
                    cargo: newJob.cargo,
                    pickup: newJob.pickup
                });
            }
        } catch (error) {
            // No available vehicles
            await Job.findByIdAndUpdate(newJob._id, { status: 'pending' });
            return {
                status: 200,
                payload: {
                    success: true,
                    message: 'Job created but no vehicles available. Job is pending.',
                    job: newJob,
                    vehicleAvailable: false
                }
            };
        }

        const assignedVehicle = bestVehicleMatch.vehicle;

        // Step 2.5: Assign Driver
        let assignedDriver = null;
        if (driverId) {
            assignedDriver = await Driver.findById(driverId);
            if (!assignedDriver) {
                return {
                    status: 404,
                    payload: {
                        success: false,
                        error: 'Selected driver not found'
                    }
                };
            }
        }

        // Step 3: Search for backhaul opportunities
        const tripDistance = newJob.calculateDistance();
        const estimatedDuration = (tripDistance / 1000) / 60; // Rough estimate: 60 km/h
        const estimatedDeliveryTime = new Date(
            newJob.pickup.datetime.getTime() + (estimatedDuration * 60 * 60 * 1000)
        );

        let backhaulJob = null;
        const { selectedBackhaulId } = bookingData;

        if (selectedBackhaulId === 'skip') {
            // User explicitly chose to skip backhaul
            backhaulJob = null;
        } else if (selectedBackhaulId) {
            // User selected a specific backhaul
            backhaulJob = await Job.findById(selectedBackhaulId);
        } else {
            // Fallback to automatic matching (legacy behavior)
            const backhaulOpportunities = await backhaulFinder.findBackhaulOpportunities(
                newJob,
                assignedVehicle.capacity,
                estimatedDeliveryTime,
                { minRadius: 25000, radiusPercentage: 0.20 } // Ensure reliable 25km min search area
            );

            backhaulJob = backhaulOpportunities.length > 0
                ? await Job.findById(backhaulOpportunities[0]._id)
                : null;
        }

        // Step 4: Optimize route with Google Maps / ORS
        const optimizedRoute = await routeOptimizer.optimizeJobRoute(
            newJob,
            backhaulJob,
            assignedVehicle.fuelEfficiency,
            assignedVehicle.vehicleType
        );

        // Step 5: Create trip
        const newTrip = new Trip({
            jobId: newJob.jobId,
            vehicle: assignedVehicle._id,
            driver: assignedDriver ? assignedDriver._id : null,
            primaryJob: newJob._id,
            backhaulJob: backhaulJob ? backhaulJob._id : null,
            route: {
                coordinates: optimizedRoute.coordinates,
                distance: optimizedRoute.distance,
                duration: optimizedRoute.duration,
                polyline: optimizedRoute.polyline,
                estimatedFuelCost: optimizedRoute.estimatedFuelCost,
                waypointOrder: optimizedRoute.waypointOrder
            },
            status: 'scheduled'
        });

        await newTrip.save();

        // Step 6: Generate digital manifest
        const manifest = manifestGenerator.generateManifest(
            newTrip,
            assignedVehicle,
            newJob,
            backhaulJob,
            optimizedRoute
        );

        newTrip.manifest = manifest;
        await newTrip.save();

        // Step 7: Update job statuses
        newJob.status = 'assigned';
        newJob.assignedVehicle = assignedVehicle._id;
        newJob.assignedTrip = newTrip._id;
        await newJob.save();

        if (backhaulJob) {
            backhaulJob.status = 'assigned';
            backhaulJob.jobType = 'backhaul';
            backhaulJob.assignedVehicle = assignedVehicle._id;
            backhaulJob.assignedTrip = newTrip._id;
            await backhaulJob.save();
        }

        // Step 8: Vehicle operational status is separate from trip occupancy; no status change needed here.

        // Step 8.5: Update driver status
        if (assignedDriver) {
            assignedDriver.status = 'on-trip';
            assignedDriver.currentVehicle = assignedVehicle._id;
            assignedDriver.currentTrip = newTrip._id;
            await assignedDriver.save();

            // Notify assigned driver about newly created trip.
            await Notification.create({
                title: 'New Trip Assigned',
                message: `You have been assigned trip ${newTrip.jobId || newTrip.tripId}.`,
                type: 'system',
                link: '/trips',
                driverId: assignedDriver._id
            });
        }

        // Step 9: Push to Firebase for real-time driver access
        try {
            await firebaseService.pushTripToFirebase(
                newTrip,
                assignedVehicle,
                newJob,
                backhaulJob,
                optimizedRoute
            );
        } catch (firebaseError) {
            console.error('Firebase push failed:', firebaseError.message);
            // Continue - Firebase failure shouldn't break the booking
        }

        // Step 9.5: Send booking confirmation email to customer
        if (newJob.customer && newJob.customer.email) {
            // We pass the success data payload which contains job, trip, vehicle, driver, and route info
            emailService.sendBookingConfirmation(newJob.customer, newJob.jobId, {
                job: {
                    jobId: newJob.jobId,
                    status: newJob.status,
                    cargo: newJob.cargo,
                    pickup: newJob.pickup,
                    delivery: newJob.delivery
                },
                trip: {
                    tripId: newTrip.jobId || newTrip.tripId,
                    status: newTrip.status
                },
                vehicle: {
                    registrationNumber: assignedVehicle.registrationNumber,
                    type: assignedVehicle.vehicleType
                },
                driver: assignedDriver ? {
                    name: assignedDriver.name,
                    contactNumber: assignedDriver.contactNumber
                } : null,
                route: {
                    distance: `${(optimizedRoute.distance / 1000).toFixed(2)} km`,
                    duration: `${(optimizedRoute.duration / 3600).toFixed(2)} hours`
                }
            });
        }

        // Step 10: Return success response
        return {
            status: 201,
            payload: {
                success: true,
                message: backhaulJob
                    ? 'Job booked successfully with backhaul coordination'
                    : 'Job booked successfully',
                data: {
                    job: {
                        jobId: newJob.jobId,
                        _id: newJob._id,
                        status: newJob.status,
                        cargo: newJob.cargo,
                        pickup: newJob.pickup,
                        delivery: newJob.delivery
                    },
                    trip: {
                        tripId: newTrip.jobId || newTrip.tripId,
                        _id: newTrip._id,
                        status: newTrip.status
                    },
                    vehicle: {
                        registrationNumber: assignedVehicle.registrationNumber,
                        type: assignedVehicle.vehicleType,
                        matchScore: bestVehicleMatch.score,
                        matchBreakdown: bestVehicleMatch.breakdown
                    },
                    driver: assignedDriver ? {
                        name: assignedDriver.name,
                        contactNumber: assignedDriver.contactNumber
                    } : null,
                    backhaul: backhaulJob ? {
                        jobId: backhaulJob.jobId,
                        cargo: backhaulJob.cargo,
                        pickup: backhaulJob.pickup.address,
                        delivery: backhaulJob.delivery.address,
                        pickupCoordinates: backhaulJob.pickup.location.coordinates,
                        deliveryCoordinates: backhaulJob.delivery.location.coordinates,
                        savings: manifest.economics.fuelCostSavings
                    } : null,
                    route: {
                        distance: `${(optimizedRoute.distance / 1000).toFixed(2)} km`,
                        duration: `${(optimizedRoute.duration / 3600).toFixed(2)} hours`,
                        estimatedFuelCost: `LKR ${optimizedRoute.estimatedFuelCost}`,
                        coordinates: optimizedRoute.coordinates
                    },
                    economics: manifest.economics,
                    manifest: manifest
                }
            }
        };

    } catch (error) {
        console.error('Job booking error:', error);

        // Handle Mongoose validation errors specifically
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return {
                status: 400,
                payload: {
                    success: false,
                    error: 'Validation failed',
                    details: messages.join(', ')
                }
            };
        }

        return {
            status: 500,
            payload: {
                success: false,
                error: 'Failed to book job',
                details: error.message
            }
        };
    }
};
