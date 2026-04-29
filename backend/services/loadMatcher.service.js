const Vehicle = require('../models/vehicle.model');
const Trip = require('../models/trip.model');

/**
 * Load Matcher Service
 * Implements capacity-optimized vehicle matching algorithm
 * Prioritizes: Capacity fit (60%) > Distance (40%)
 */

/**
 * Calculate distance between two points using Haversine formula
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {Number} Distance in meters
 */
function calculateDistance(coord1, coord2) {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calculate capacity score - measures how well cargo fits vehicle
 * Penalizes both under-utilization and near-capacity loads
 * Optimal: 70-85% utilization
 * @param {Number} cargoWeight - Weight in kg
 * @param {Number} cargoVolume - Volume in cubic meters
 * @param {Object} vehicleCapacity - { weight, volume }
 * @returns {Number} Score from 0 to 100
 */
function calculateCapacityScore(cargoWeight, cargoVolume, vehicleCapacity) {
    const weightUtilization = (cargoWeight / vehicleCapacity.weight) * 100;
    const volumeUtilization = (cargoVolume / vehicleCapacity.volume) * 100;

    // Use the limiting factor (higher utilization)
    const utilization = Math.max(weightUtilization, volumeUtilization);

    // Optimal range: 70-85%
    if (utilization >= 70 && utilization <= 85) {
        return 100; // Perfect fit
    } else if (utilization < 70) {
        // Under-utilization penalty (linear)
        // 50% util = 70 score, 30% util = 50 score
        return Math.max(0, 40 + (utilization * 0.857)); // Maps 0-70% to 40-100
    } else if (utilization > 85 && utilization <= 95) {
        // Near capacity - still good but slightly penalized
        return 100 - ((utilization - 85) * 2); // 95% = 80 score
    } else if (utilization > 95) {
        // Too close to capacity - risky
        return Math.max(0, 80 - ((utilization - 95) * 8)); // Drops quickly
    }

    return 0;
}

/**
 * Calculate distance score - inverse normalized distance
 * Closer vehicles get higher scores
 * @param {Number} distance - Distance in meters
 * @param {Number} maxDistance - Maximum distance to consider (default 200km)
 * @returns {Number} Score from 0 to 100
 */
function calculateDistanceScore(distance, maxDistance = 200000) {
    if (distance >= maxDistance) {
        return 0;
    }

    // Inverse linear relationship
    // 0m = 100, maxDistance = 0
    return 100 * (1 - (distance / maxDistance));
}

/**
 * Find the best vehicle match for a job
 * Algorithm: Weighted scoring with capacity priority
 * @param {Object} jobDetails - { cargo: {weight, volume}, pickup: {location: {coordinates}} }
 * @param {Object} options - { distanceWeight, capacityWeight, maxDistance }
 * @returns {Promise<Object>} { vehicle, score, breakdown }
 */
async function findBestVehicle(jobDetails, options = {}) {
    const {
        distanceWeight = 0.4,  // 40% weight on distance
        capacityWeight = 0.6,  // 60% weight on capacity (user preference)
        maxDistance = 200000   // 200km max search radius
    } = options;

    const { cargo, pickup, delivery } = jobDetails;
    const pickupCoords = pickup.location ? pickup.location.coordinates : pickup.coordinates;
    const now = new Date();

    const newJobStart = pickup.datetime ? new Date(pickup.datetime) : new Date();
    // Default to 4 hours if delivery time is missing
    const newJobEnd = delivery && delivery.datetime ? new Date(delivery.datetime) : new Date(newJobStart.getTime() + (4 * 60 * 60 * 1000));

    // Buffer to ensure driver has time to travel between jobs (1 hour)
    const bufferMs = 60 * 60 * 1000;
    const searchStart = new Date(newJobStart.getTime() - bufferMs);
    const searchEnd = new Date(newJobEnd.getTime() + bufferMs);

    // Step 1: Find potential vehicles that can carry the cargo (excluding maintenance/out-of-service/offline)
    const potentialVehicles = await Vehicle.find({
        status: { $nin: ['In Maintenance', 'Out of Service', 'maintenance', 'offline'] },
        $and: [
            { $or: [{ licenseEndDate: { $exists: false } }, { licenseEndDate: null }, { licenseEndDate: { $gte: now } }] },
            { $or: [{ insuranceEndDate: { $exists: false } }, { insuranceEndDate: null }, { insuranceEndDate: { $gte: now } }] }
        ],
        'capacity.weight': { $gte: cargo.weight },
        'capacity.volume': { $gte: cargo.volume }
    });

    if (potentialVehicles.length === 0) {
        throw new Error('No available vehicles can carry this cargo. Consider splitting the load or upgrading fleet.');
    }

    const vehicleIds = potentialVehicles.map(v => v._id);

    // Step 1.5: Identify which vehicles are busy during this specific time window
    // We check scheduled and active trips
    const overlappingTrips = await Trip.find({
        vehicle: { $in: vehicleIds },
        status: { $in: ['scheduled', 'active'] }
    }).populate('primaryJob backhaulJob');

    const busyVehicleIds = new Set();

    overlappingTrips.forEach(trip => {
        let tripStart, tripEnd;

        if (trip.primaryJob && trip.primaryJob.pickup) {
            tripStart = new Date(trip.primaryJob.pickup.datetime);

            // End time is either backhaul delivery or primary delivery
            if (trip.backhaulJob && trip.backhaulJob.delivery) {
                tripEnd = new Date(trip.backhaulJob.delivery.datetime);
            } else if (trip.primaryJob.delivery) {
                tripEnd = new Date(trip.primaryJob.delivery.datetime);
            } else {
                tripEnd = new Date(tripStart.getTime() + (4 * 60 * 60 * 1000)); // fallback
            }

            // Check if intervals overlap logic: (StartA < EndB) and (EndA > StartB)
            if (searchStart < tripEnd && searchEnd > tripStart) {
                busyVehicleIds.add(trip.vehicle.toString());
            }
        }
    });

    // Filter down to truly available vehicles
    const availableVehicles = potentialVehicles.filter(v => !busyVehicleIds.has(v._id.toString()));

    if (availableVehicles.length === 0) {
        throw new Error('All capable vehicles are booked during this time period.');
    }

    // Step 2: Score each vehicle
    const scoredVehicles = availableVehicles.map(vehicle => {
        const vehicleCoords = vehicle.currentLocation.coordinates;
        const distance = calculateDistance(pickupCoords, vehicleCoords);

        // Calculate individual scores
        const distanceScore = calculateDistanceScore(distance, maxDistance);
        const capacityScore = calculateCapacityScore(
            cargo.weight,
            cargo.volume,
            vehicle.capacity
        );

        // Weighted total score
        const totalScore = (distanceScore * distanceWeight) + (capacityScore * capacityWeight);

        return {
            vehicle,
            totalScore,
            breakdown: {
                distance: distance,
                distanceScore: distanceScore.toFixed(2),
                capacityScore: capacityScore.toFixed(2),
                utilization: {
                    weight: ((cargo.weight / vehicle.capacity.weight) * 100).toFixed(1),
                    volume: ((cargo.volume / vehicle.capacity.volume) * 100).toFixed(1)
                }
            }
        };
    });

    // Step 3: Sort by score (highest first)
    scoredVehicles.sort((a, b) => b.totalScore - a.totalScore);

    // Step 4: Return best match
    const bestMatch = scoredVehicles[0];

    return {
        vehicle: bestMatch.vehicle,
        score: bestMatch.totalScore.toFixed(2),
        breakdown: bestMatch.breakdown,
        alternatives: scoredVehicles.slice(1, 4).map(v => ({
            vehicleId: v.vehicle._id,
            registrationNumber: v.vehicle.registrationNumber,
            score: v.totalScore.toFixed(2)
        }))
    };
}

/**
 * Get all available vehicles with their current scores for a job
 * Useful for manual vehicle selection UI
 * @param {Object} jobDetails 
 * @returns {Promise<Array>} Scored vehicles sorted by best match
 */
async function getAllMatchedVehicles(jobDetails) {
    const result = await findBestVehicle(jobDetails);
    const { cargo, pickup, delivery } = jobDetails;
    const pickupCoords = pickup.location ? pickup.location.coordinates : pickup.coordinates;

    const newJobStart = pickup.datetime ? new Date(pickup.datetime) : new Date();
    const newJobEnd = delivery && delivery.datetime ? new Date(delivery.datetime) : new Date(newJobStart.getTime() + (4 * 60 * 60 * 1000));
    const bufferMs = 60 * 60 * 1000;
    const searchStart = new Date(newJobStart.getTime() - bufferMs);
    const searchEnd = new Date(newJobEnd.getTime() + bufferMs);

    const now = new Date();
    const potentialVehicles = await Vehicle.find({
        status: { $nin: ['In Maintenance', 'Out of Service', 'maintenance', 'offline'] },
        $and: [
            { $or: [{ licenseEndDate: { $exists: false } }, { licenseEndDate: null }, { licenseEndDate: { $gte: now } }] },
            { $or: [{ insuranceEndDate: { $exists: false } }, { insuranceEndDate: null }, { insuranceEndDate: { $gte: now } }] }
        ],
        'capacity.weight': { $gte: cargo.weight },
        'capacity.volume': { $gte: cargo.volume }
    });

    const vehicleIds = potentialVehicles.map(v => v._id);

    const overlappingTrips = await Trip.find({
        vehicle: { $in: vehicleIds },
        status: { $in: ['scheduled', 'active'] }
    }).populate('primaryJob backhaulJob');

    const busyVehicleIds = new Set();

    overlappingTrips.forEach(trip => {
        let tripStart, tripEnd;

        if (trip.primaryJob && trip.primaryJob.pickup) {
            tripStart = new Date(trip.primaryJob.pickup.datetime);

            if (trip.backhaulJob && trip.backhaulJob.delivery) {
                tripEnd = new Date(trip.backhaulJob.delivery.datetime);
            } else if (trip.primaryJob.delivery) {
                tripEnd = new Date(trip.primaryJob.delivery.datetime);
            } else {
                tripEnd = new Date(tripStart.getTime() + (4 * 60 * 60 * 1000));
            }

            if (searchStart < tripEnd && searchEnd > tripStart) {
                busyVehicleIds.add(trip.vehicle.toString());
            }
        }
    });

    const availableVehicles = potentialVehicles.filter(v => !busyVehicleIds.has(v._id.toString()));

    return availableVehicles.map(vehicle => {
        const distance = calculateDistance(
            pickupCoords,
            vehicle.currentLocation.coordinates
        );

        const distanceScore = calculateDistanceScore(distance);
        const capacityScore = calculateCapacityScore(
            cargo.weight,
            cargo.volume,
            vehicle.capacity
        );

        const totalScore = (distanceScore * 0.4) + (capacityScore * 0.6);

        return {
            _id: vehicle._id,
            registrationNumber: vehicle.registrationNumber,
            vehicleType: vehicle.vehicleType,
            capacity: vehicle.capacity,
            currentLocation: vehicle.currentLocation,
            distance: Math.round(distance / 1000), // km
            score: totalScore.toFixed(2),
            utilization: {
                weight: ((cargo.weight / vehicle.capacity.weight) * 100).toFixed(1) + '%',
                volume: ((cargo.volume / vehicle.capacity.volume) * 100).toFixed(1) + '%'
            }
        };
    }).sort((a, b) => b.score - a.score);
}

module.exports = {
    findBestVehicle,
    getAllMatchedVehicles,
    calculateDistance,
    calculateCapacityScore,
    calculateDistanceScore
};
