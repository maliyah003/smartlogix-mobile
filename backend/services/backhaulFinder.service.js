const Job = require('../models/job.model');

/**
 * Backhaul Finder Service
 * Implements dynamic backhaul search with geospatial queries
 * Search radius: 10% of total trip distance (user preference)
 */

/**
 * Calculate trip distance using Haversine formula
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
 * Find backhaul opportunities for a primary job
 * Uses dynamic search radius: 10% of trip distance
 * @param {Object} primaryJob - Primary job with delivery location
 * @param {Object} vehicleCapacity - { weight, volume }
 * @param {Date} estimatedDeliveryTime - When primary job will be delivered
 * @param {Object} options - { radiusPercentage, minRadius, maxRadius }
 * @returns {Promise<Array>} Ranked backhaul opportunities
 */
async function findBackhaulOpportunities(primaryJob, vehicleCapacity, estimatedDeliveryTime, options = {}) {
    const {
        radiusPercentage = 0.20,  // 20% of trip distance
        minRadius = 25000,        // Minimum 25km search radius
        maxRadius = 100000        // Maximum 100km search radius
    } = options;

    // Calculate primary trip distance
    const tripDistance = calculateDistance(
        primaryJob.pickup.location.coordinates,
        primaryJob.delivery.location.coordinates
    );

    // Calculate dynamic search radius (10% of trip distance)
    let searchRadius = tripDistance * radiusPercentage;

    // Apply min/max constraints
    searchRadius = Math.max(minRadius, Math.min(searchRadius, maxRadius));

    const deliveryCoords = primaryJob.delivery.location.coordinates;
    const pickupCoords = primaryJob.pickup.location.coordinates; // The "home" base we want to return to

    // Geospatial aggregation query
    // Find pending jobs with pickup near the primary delivery location
    const backhaulCandidates = await Job.aggregate([
        {
            // Stage 1: Geospatial search near primary delivery point
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: deliveryCoords
                },
                key: 'pickup.location',
                distanceField: 'distanceFromDelivery',
                maxDistance: searchRadius,
                spherical: true,
                query: {
                    status: 'pending',
                    // Ensure cargo fits in vehicle
                    'cargo.weight': { $lte: vehicleCapacity.weight },
                    'cargo.volume': { $lte: vehicleCapacity.volume },
                    // Pickup must be after estimated delivery time
                    'pickup.datetime': { $gte: estimatedDeliveryTime },
                    // Make sure we don't backhaul the exact same job we are running
                    _id: { $ne: primaryJob._id }
                }
            }
        },
        {
            // Stage 2: Calculate additional metrics
            $addFields: {
                // Capacity utilization
                weightUtilization: {
                    $multiply: [
                        { $divide: ['$cargo.weight', vehicleCapacity.weight] },
                        100
                    ]
                },
                volumeUtilization: {
                    $multiply: [
                        { $divide: ['$cargo.volume', vehicleCapacity.volume] },
                        100
                    ]
                }
            }
        },
        {
            // Stage 3: Project relevant fields
            $project: {
                jobId: 1,
                cargo: 1,
                pickup: 1,
                delivery: 1,
                distanceFromDelivery: 1,
                weightUtilization: 1,
                volumeUtilization: 1,
                pricing: 1
            }
        }
    ]);

    // Stage 4: Filter in JS to ensure the backhaul job's delivery is near the primary job's pickup (returning home)
    const validBackhauls = backhaulCandidates.filter(candidate => {
        const distToHome = calculateDistance(candidate.delivery.location.coordinates, pickupCoords);
        // Delivery point of backhaul must be within a forgiving radius of the original origin 
        // e.g., 25km radius around Colombo if the original start point was Colombo
        const homeTolerance = Math.max(searchRadius * 1.5, 25000);
        return distToHome <= homeTolerance;
    });

    // Stage 5: Calculate composite score and rank
    const rankedBackhauls = validBackhauls.map(candidate => {
        const distScore = (1 - (candidate.distanceFromDelivery / searchRadius)) * 50;
        const utilScore = Math.max(candidate.weightUtilization / 100, candidate.volumeUtilization / 100) * 50;
        return {
            ...candidate,
            score: Math.max(0, distScore + utilScore), // Ensure score is > 0
            estimatedRevenue: candidate.pricing?.quotedPrice
        };
    }).sort((a, b) => b.score - a.score).slice(0, 5); // Take top 5

    // Format results
    return rankedBackhauls.map(candidate => ({
        jobId: candidate.jobId,
        _id: candidate._id,
        cargo: candidate.cargo,
        pickup: {
            address: candidate.pickup.address,
            coordinates: candidate.pickup.location.coordinates,
            datetime: candidate.pickup.datetime
        },
        delivery: {
            address: candidate.delivery.address,
            coordinates: candidate.delivery.location.coordinates,
            datetime: candidate.delivery.datetime
        },
        distanceFromDelivery: Math.round(candidate.distanceFromDelivery), // meters
        utilization: {
            weight: candidate.weightUtilization.toFixed(1) + '%',
            volume: candidate.volumeUtilization.toFixed(1) + '%'
        },
        score: candidate.score.toFixed(2),
        estimatedRevenue: candidate.estimatedRevenue || null,
        searchRadius: Math.round(searchRadius) // Include for transparency
    }));
}

/**
 * Find backhaul opportunities by coordinates
 * Useful for standalone backhaul search (not tied to a primary job)
 * @param {Array} coordinates - [longitude, latitude]
 * @param {Object} vehicleCapacity - { weight, volume }
 * @param {Date} availableFrom - Earliest pickup time
 * @param {Number} radius - Search radius in meters
 * @returns {Promise<Array>} Ranked backhaul opportunities
 */
async function findBackhaulByLocation(coordinates, vehicleCapacity, availableFrom, radius = 50000) {
    const backhaulCandidates = await Job.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: coordinates
                },
                key: 'pickup.location',
                distanceField: 'distance',
                maxDistance: radius,
                spherical: true,
                query: {
                    status: 'pending',
                    'cargo.weight': { $lte: vehicleCapacity.weight },
                    'cargo.volume': { $lte: vehicleCapacity.volume },
                    'pickup.datetime': { $gte: availableFrom }
                }
            }
        },
        {
            $addFields: {
                weightUtilization: {
                    $multiply: [
                        { $divide: ['$cargo.weight', vehicleCapacity.weight] },
                        100
                    ]
                },
                volumeUtilization: {
                    $multiply: [
                        { $divide: ['$cargo.volume', vehicleCapacity.volume] },
                        100
                    ]
                }
            }
        },
        {
            $sort: { distance: 1 }
        },
        {
            $limit: 10
        }
    ]);

    return backhaulCandidates.map(candidate => ({
        jobId: candidate.jobId,
        _id: candidate._id,
        cargo: candidate.cargo,
        pickup: {
            address: candidate.pickup.address,
            coordinates: candidate.pickup.location.coordinates,
            datetime: candidate.pickup.datetime
        },
        delivery: {
            address: candidate.delivery.address,
            coordinates: candidate.delivery.location.coordinates
        },
        distance: Math.round(candidate.distance),
        utilization: {
            weight: candidate.weightUtilization.toFixed(1) + '%',
            volume: candidate.volumeUtilization.toFixed(1) + '%'
        }
    }));
}

/**
 * Calculate estimated profit from backhaul
 * @param {Object} backhaulJob - Backhaul job with pricing
 * @param {Number} extraDistance - Additional distance due to backhaul (meters)
 * @param {Number} fuelEfficiency - Vehicle fuel efficiency (km/L)
 * @param {Number} fuelPrice - Current fuel price (LKR/L)
 * @returns {Object} { revenue, extraCost, profit, savingsFromEmptyReturn }
 */
function calculateBackhaulProfit(backhaulJob, extraDistance, fuelEfficiency = 8, fuelPrice = 350) {
    const revenue = backhaulJob.pricing?.quotedPrice || 0;

    // Extra fuel cost due to additional distance
    const extraDistanceKm = extraDistance / 1000;
    const extraFuelCost = (extraDistanceKm / fuelEfficiency) * fuelPrice;

    // Profit from backhaul
    const profit = revenue - extraFuelCost;

    // Savings from avoiding empty return
    // Assumption: Without backhaul, truck returns empty over same distance
    const returnDistance = extraDistance; // Rough estimate
    const returnFuelCost = (returnDistance / 1000 / fuelEfficiency) * fuelPrice;

    return {
        revenue: Math.round(revenue),
        extraCost: Math.round(extraFuelCost),
        profit: Math.round(profit),
        savingsFromEmptyReturn: Math.round(returnFuelCost)
    };
}

module.exports = {
    findBackhaulOpportunities,
    findBackhaulByLocation,
    calculateBackhaulProfit,
    calculateDistance
};
