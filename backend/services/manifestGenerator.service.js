/**
 * Manifest Generator Service
 * Creates comprehensive digital manifests for trips
 * Includes route details, cargo info, economics, and compliance data
 */

/**
 * Generate digital manifest for a trip
 * @param {Object} trip - Trip object with all references populated
 * @param {Object} vehicle - Vehicle object
 * @param {Object} primaryJob - Primary job object
 * @param {Object} backhaulJob - Optional backhaul job object
 * @param {Object} route - Route object from routeOptimizer
 * @returns {Object} Complete digital manifest
 */
function generateManifest(trip, vehicle, primaryJob, backhaulJob, route) {
    const manifest = {
        // Manifest metadata
        manifestId: `MANIFEST-${trip.tripId}`,
        generatedAt: new Date(),
        version: '1.0',

        // Trip identification
        tripId: trip.tripId,
        status: trip.status,

        // Vehicle details (snapshot)
        vehicleDetails: {
            registrationNumber: vehicle.registrationNumber,
            type: vehicle.vehicleType,
            capacity: {
                weight: vehicle.capacity.weight,
                volume: vehicle.capacity.volume
            },
            fuelEfficiency: vehicle.fuelEfficiency
        },

        // Driver information
        driver: vehicle.driver || {
            name: 'Unassigned',
            phone: null,
            licenseNumber: null
        },

        // Jobs summary
        jobs: buildJobsSummary(primaryJob, backhaulJob),

        // Route details
        routeDetails: {
            totalDistance: route.distance, // meters
            totalDistanceKm: (route.distance / 1000).toFixed(2),
            totalDuration: route.duration, // seconds
            totalDurationHours: (route.duration / 3600).toFixed(2),
            waypoints: route.waypointOrder || [],
            estimatedFuelCost: route.estimatedFuelCost,
            polyline: route.polyline
        },

        // Economics
        economics: calculateEconomics(primaryJob, backhaulJob, route),

        // Compliance & safety
        compliance: {
            cargoTypes: getCargoTypes(primaryJob, backhaulJob),
            specialHandling: getSpecialHandling(primaryJob, backhaulJob),
            requiredDocuments: ['Delivery Note', 'Invoice', 'Driver License', 'Vehicle Registration']
        },

        // Schedule
        schedule: buildSchedule(primaryJob, backhaulJob),

        // Contact information
        contacts: buildContactsInfo(primaryJob, backhaulJob)
    };

    return manifest;
}

/**
 * Build jobs summary for manifest
 * @param {Object} primaryJob 
 * @param {Object} backhaulJob 
 * @returns {Array} Jobs array
 */
function buildJobsSummary(primaryJob, backhaulJob) {
    const jobs = [
        {
            jobId: primaryJob.jobId,
            type: 'primary',
            cargo: {
                description: primaryJob.cargo.description,
                weight: primaryJob.cargo.weight,
                volume: primaryJob.cargo.volume,
                type: primaryJob.cargo.type
            },
            pickup: {
                address: primaryJob.pickup.address,
                coordinates: primaryJob.pickup.location.coordinates,
                datetime: primaryJob.pickup.datetime,
                contact: {
                    name: primaryJob.pickup.contactName || primaryJob.customer?.name,
                    phone: primaryJob.pickup.contactPhone || primaryJob.customer?.phone
                }
            },
            delivery: {
                address: primaryJob.delivery.address,
                coordinates: primaryJob.delivery.location.coordinates,
                datetime: primaryJob.delivery.datetime,
                contact: {
                    name: primaryJob.delivery.contactName,
                    phone: primaryJob.delivery.contactPhone
                }
            },
            pricing: primaryJob.pricing || null
        }
    ];

    if (backhaulJob) {
        jobs.push({
            jobId: backhaulJob.jobId,
            type: 'backhaul',
            cargo: {
                description: backhaulJob.cargo.description,
                weight: backhaulJob.cargo.weight,
                volume: backhaulJob.cargo.volume,
                type: backhaulJob.cargo.type
            },
            pickup: {
                address: backhaulJob.pickup.address,
                coordinates: backhaulJob.pickup.location.coordinates,
                datetime: backhaulJob.pickup.datetime,
                contact: {
                    name: backhaulJob.pickup.contactName || backhaulJob.customer?.name,
                    phone: backhaulJob.pickup.contactPhone || backhaulJob.customer?.phone
                }
            },
            delivery: {
                address: backhaulJob.delivery.address,
                coordinates: backhaulJob.delivery.location.coordinates,
                datetime: backhaulJob.delivery.datetime,
                contact: {
                    name: backhaulJob.delivery.contactName,
                    phone: backhaulJob.delivery.contactPhone
                }
            },
            pricing: backhaulJob.pricing || null
        });
    }

    return jobs;
}

/**
 * Calculate economics for manifest
 * @param {Object} primaryJob 
 * @param {Object} backhaulJob 
 * @param {Object} route 
 * @returns {Object} Economics breakdown
 */
function calculateEconomics(primaryJob, backhaulJob, route) {
    // Calculate revenue
    const primaryRevenue = primaryJob.pricing?.quotedPrice || primaryJob.pricing?.finalPrice || 0;
    const backhaulRevenue = backhaulJob?.pricing?.quotedPrice || backhaulJob?.pricing?.finalPrice || 0;
    const totalRevenue = primaryRevenue + backhaulRevenue;

    // Calculate costs
    const fuelCost = route.estimatedFuelCost || 0;
    const driverCost = 2000; // Estimate: LKR 2000 per trip (can be configurable)
    const maintenanceCost = (route.distance / 1000) * 10; // LKR 10 per km estimate
    const estimatedCosts = fuelCost + driverCost + maintenanceCost;

    // Calculate profit
    const estimatedProfit = totalRevenue - estimatedCosts;

    // Calculate empty miles reduction
    let emptyMilesReduction = "0%";
    let fuelCostSavings = 0;

    if (backhaulJob) {
        // With backhaul, we avoid empty return journey
        // Assume return distance ≈ 50% of total route distance
        const estimatedEmptyReturnDistance = route.distance * 0.5;
        const reduction = (estimatedEmptyReturnDistance / route.distance) * 100;
        emptyMilesReduction = `${Math.round(reduction)}%`;

        // Fuel savings from avoiding empty return
        const savedDistance = estimatedEmptyReturnDistance / 1000; // km
        const fuelEfficiency = 8; // km/L default
        const fuelPrice = 350; // LKR/L
        fuelCostSavings = Math.round((savedDistance / fuelEfficiency) * fuelPrice);
    }

    return {
        totalRevenue: Math.round(totalRevenue),
        estimatedCosts: Math.round(estimatedCosts),
        breakdown: {
            fuelCost: Math.round(fuelCost),
            driverCost: Math.round(driverCost),
            maintenanceCost: Math.round(maintenanceCost)
        },
        estimatedProfit: Math.round(estimatedProfit),
        profitMargin: totalRevenue > 0 ? `${((estimatedProfit / totalRevenue) * 100).toFixed(1)}%` : '0%',
        emptyMilesReduction: emptyMilesReduction,
        fuelCostSavings: Math.round(fuelCostSavings),
        currency: 'LKR'
    };
}

/**
 * Get all cargo types from jobs
 * @param {Object} primaryJob 
 * @param {Object} backhaulJob 
 * @returns {Array} Cargo types
 */
function getCargoTypes(primaryJob, backhaulJob) {
    const types = [primaryJob.cargo.type];
    if (backhaulJob) {
        types.push(backhaulJob.cargo.type);
    }
    return [...new Set(types)]; // Remove duplicates
}

/**
 * Get special handling requirements
 * @param {Object} primaryJob 
 * @param {Object} backhaulJob 
 * @returns {Array} Special handling notes
 */
function getSpecialHandling(primaryJob, backhaulJob) {
    const handling = [];

    if (primaryJob.cargo.type === 'fragile') {
        handling.push('Primary cargo: Handle with care - Fragile items');
    }
    if (primaryJob.cargo.type === 'perishable') {
        handling.push('Primary cargo: Perishable - Maintain temperature control');
    }
    if (primaryJob.cargo.type === 'hazardous') {
        handling.push('Primary cargo: Hazardous materials - Follow safety protocols');
    }

    if (backhaulJob) {
        if (backhaulJob.cargo.type === 'fragile') {
            handling.push('Backhaul cargo: Handle with care - Fragile items');
        }
        if (backhaulJob.cargo.type === 'perishable') {
            handling.push('Backhaul cargo: Perishable - Maintain temperature control');
        }
        if (backhaulJob.cargo.type === 'hazardous') {
            handling.push('Backhaul cargo: Hazardous materials - Follow safety protocols');
        }
    }

    if (primaryJob.specialInstructions) {
        handling.push(`Primary: ${primaryJob.specialInstructions}`);
    }
    if (backhaulJob?.specialInstructions) {
        handling.push(`Backhaul: ${backhaulJob.specialInstructions}`);
    }

    return handling.length > 0 ? handling : ['Standard handling'];
}

/**
 * Build schedule for manifest
 * @param {Object} primaryJob 
 * @param {Object} backhaulJob 
 * @returns {Object} Schedule
 */
function buildSchedule(primaryJob, backhaulJob) {
    const schedule = {
        primaryPickup: primaryJob.pickup.datetime,
        primaryDelivery: primaryJob.delivery.datetime
    };

    if (backhaulJob) {
        schedule.backhaulPickup = backhaulJob.pickup.datetime;
        schedule.backhaulDelivery = backhaulJob.delivery.datetime;
    }

    return schedule;
}

/**
 * Build contacts information
 * @param {Object} primaryJob 
 * @param {Object} backhaulJob 
 * @returns {Object} Contacts
 */
function buildContactsInfo(primaryJob, backhaulJob) {
    const contacts = {
        primaryCustomer: {
            name: primaryJob.customer?.name || 'N/A',
            phone: primaryJob.customer?.phone || 'N/A',
            email: primaryJob.customer?.email || 'N/A'
        }
    };

    if (backhaulJob) {
        contacts.backhaulCustomer = {
            name: backhaulJob.customer?.name || 'N/A',
            phone: backhaulJob.customer?.phone || 'N/A',
            email: backhaulJob.customer?.email || 'N/A'
        };
    }

    return contacts;
}

/**
 * Generate simplified manifest (for driver mobile app)
 * @param {Object} fullManifest 
 * @returns {Object} Simplified manifest
 */
function generateSimplifiedManifest(fullManifest) {
    return {
        tripId: fullManifest.tripId,
        vehicle: fullManifest.vehicleDetails.registrationNumber,
        jobs: fullManifest.jobs.map(job => ({
            jobId: job.jobId,
            type: job.type,
            cargo: job.cargo.description,
            pickup: job.pickup.address,
            delivery: job.delivery.address
        })),
        route: {
            totalDistance: fullManifest.routeDetails.totalDistanceKm + ' km',
            estimatedDuration: fullManifest.routeDetails.totalDurationHours + ' hours'
        },
        earnings: `LKR ${fullManifest.economics.estimatedProfit.toLocaleString()}`
    };
}

module.exports = {
    generateManifest,
    generateSimplifiedManifest,
    calculateEconomics,
    buildJobsSummary
};
