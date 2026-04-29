const axios = require('axios');

/**
 * Route Optimizer Service
 * Integrates with Openrouteservice (ORS) API
 * Optimizes multi stop routes for primary job + optional backhaul
 * Falls back to Haversine estimation as an absolute last resort
 */


/**
 * Calculate Haversine distance between two coordinate pairs
 * @param {Array} coord1 - [longitude, latitude]
 * @param {Array} coord2 - [longitude, latitude]
 * @returns {Number} Distance in meters
 */
function haversineDistance(coord1, coord2) {
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
 * Fallback route calculation using Haversine formula
 * Used when Google Maps API key is not configured AND OSRM fails
 * Applies a 1.3x road factor to straight-line distance
 * @param {Array} waypoints - Array of {location: [lng, lat], type: string, address: string}
 * @returns {Object} Estimated route with distance, duration, and coordinates
 */
function calculateFallbackRoute(waypoints) {
    const ROAD_FACTOR = 1.3; // Roads are typically ~30% longer than straight line
    const AVG_SPEED_MS = 16.67; // ~60 km/h average in meters/second

    let totalDistance = 0;
    const legs = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
        const straightLine = haversineDistance(waypoints[i].location, waypoints[i + 1].location);
        const roadDistance = Math.round(straightLine * ROAD_FACTOR);
        const duration = Math.round(roadDistance / AVG_SPEED_MS);

        totalDistance += roadDistance;
        legs.push({
            distance: roadDistance,
            duration: duration,
            startAddress: waypoints[i].address || `${waypoints[i].location[1]}, ${waypoints[i].location[0]}`,
            endAddress: waypoints[i + 1].address || `${waypoints[i + 1].location[1]}, ${waypoints[i + 1].location[0]}`
        });
    }

    const totalDuration = legs.reduce((sum, leg) => sum + leg.duration, 0);

    return {
        coordinates: waypoints.map(wp => wp.location),
        distance: totalDistance,
        duration: totalDuration,
        polyline: null,
        waypointOrder: [],
        legs: legs,
        isFallback: true
    };
}

/**
 * ORS (Openrouteservice) route calculation
 * Used to get route optimization respecting vehicle-specific constraints (weight, dimension)
 * @param {Array} waypoints - Array of {location: [lng, lat], type: string, address: string}
 * @param {String} vehicleType - Type of vehicle (e.g. 'van', 'light lorry', 'heavy vehicle')
 * @returns {Promise<Object>} Route with distance, duration, and coordinates
 */
async function getOptimizedRouteORS(waypoints, vehicleType = 'van') {
    try {
        let profile = 'driving-car';
        let bodyParams = {
            coordinates: waypoints.map(wp => [wp.location[0], wp.location[1]]),
            format: 'geojson',
            instructions: false,
            radiuses: waypoints.map(() => -1) // Ensure point sniffing doesn't fail based on distance
        };

        const vType = vehicleType.toLowerCase();
        if (vType.includes('light lorry') || vType.includes('lorry')) {
            profile = 'driving-hgv';
            bodyParams.options = {
                profile_params: {
                    restrictions: {
                        weight: 3.5
                    }
                }
            };
        } else if (vType.includes('heavy') || vType.includes('truck')) {
            profile = 'driving-hgv';
            bodyParams.options = {
                profile_params: {
                    restrictions: {
                        weight: 12.0,
                        height: 4.0,
                        length: 15.0
                    }
                }
            };
        }

        const apiKey = process.env.ORS_API_KEY;
        const baseUrl = process.env.ORS_BASE_URL || 'https://api.openrouteservice.org';
        const url = `${baseUrl}/v2/directions/${profile}/geojson`;

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
        };

        if (apiKey) {
            headers['Authorization'] = apiKey;
        }

        const response = await axios.post(url, bodyParams, { headers });

        if (!response.data || !response.data.features || response.data.features.length === 0) {
            throw new Error(`ORS Error: Invalid response format`);
        }

        const feature = response.data.features[0];
        const routeProperties = feature.properties;
        const geometry = feature.geometry;

        // Map ORS segments to our legs format
        // ORS segments correspond to legs between waypoints
        const legs = (routeProperties.segments || []).map((segment, index) => ({
            distance: segment.distance,
            duration: segment.duration,
            startAddress: waypoints[index]?.address || `${waypoints[index]?.location[1]}, ${waypoints[index]?.location[0]}`,
            endAddress: waypoints[index + 1]?.address || `${waypoints[index + 1]?.location[1]}, ${waypoints[index + 1]?.location[0]}`
        }));

        return {
            coordinates: geometry.coordinates,
            distance: routeProperties.summary.distance, // in meters
            duration: routeProperties.summary.duration, // in seconds
            polyline: null, // Using native coordinates from geojson
            waypointOrder: waypoints.map(wp => wp.type),
            legs: legs,
            isFallback: false
        };
    } catch (error) {
        console.error('ORS API error:', error.response?.data?.error || error.message);
        throw error;
    }
}

/**
 * Get optimized route with waypoints
 * Falls back to ORS estimation -> Haversine estimation if Google Maps API is unavailable
 * @param {Array} waypoints - Array of {location: [lng, lat], type: 'pickup'|'delivery'}
 * @param {Object} options - { optimize: boolean }
 * @param {String} vehicleType - Vehicle type for fallback ORS profile selection
 * @returns {Promise<Object>} Route with distance, duration, and coordinates
 */
async function getOptimizedRoute(waypoints, options = {}, vehicleType = 'van') {
    // We now use ORS as the primary routing engine
    try {
        return await getOptimizedRouteORS(waypoints, vehicleType);
    } catch (orsError) {
        console.warn('ℹ️  ORS routing failed. Falling back to plain Haversine distance estimation.', orsError.message);
        return calculateFallbackRoute(waypoints);
    }
}

/**
 * Calculate distance matrix between multiple points
 * Useful for pre-calculation in load matching
 * @param {Array} origins - Array of [lng, lat]
 * @param {Array} destinations - Array of [lng, lat]
 * @returns {Promise<Array>} Distance matrix
 */
async function getDistanceMatrix(origins, destinations) {
    if (!process.env.ORS_API_KEY) {
        throw new Error('ORS_API_KEY not configured');
    }

    try {
        const locations = [...origins, ...destinations];
        const sources = origins.map((_, i) => i);
        const destIndices = destinations.map((_, i) => i + origins.length);

        const bodyParams = {
            locations: locations,
            sources: sources,
            destinations: destIndices,
            metrics: ["distance", "duration"]
        };

        const apiKey = process.env.ORS_API_KEY;
        const baseUrl = process.env.ORS_BASE_URL || 'https://api.openrouteservice.org';
        const url = `${baseUrl}/v2/matrix/driving-car`;

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': apiKey
        };

        const response = await axios.post(url, bodyParams, { headers });

        if (!response.data || !response.data.distances) {
            throw new Error(`Distance Matrix API error: Invalid response format`);
        }

        return origins.map((origin, i) => ({
            origin: origin,
            elements: destinations.map((destination, j) => ({
                destination: destination,
                distance: response.data.distances[i][j] !== null ? Math.round(response.data.distances[i][j]) : null,
                duration: response.data.durations[i][j] !== null ? Math.round(response.data.durations[i][j]) : null,
                status: response.data.distances[i][j] !== null ? 'OK' : 'ZERO_RESULTS'
            }))
        }));
    } catch (error) {
        console.error('ORS Matrix API error:', error.response?.data?.error || error.message);
        throw new Error('Failed to calculate distances: ' + (error.response?.data?.error?.message || error.message));
    }
}

/**
 * Build waypoints array for a job (with optional backhaul)
 * @param {Object} primaryJob - Job with pickup and delivery
 * @param {Object} backhaulJob - Optional backhaul job
 * @returns {Array} Waypoints in order
 */
function buildWaypoints(primaryJob, backhaulJob = null) {
    const waypoints = [
        {
            location: primaryJob.pickup.location.coordinates,
            type: 'primary-pickup',
            address: primaryJob.pickup.address
        },
        {
            location: primaryJob.delivery.location.coordinates,
            type: 'primary-delivery',
            address: primaryJob.delivery.address
        }
    ];

    if (backhaulJob) {
        waypoints.push(
            {
                location: backhaulJob.pickup.location.coordinates,
                type: 'backhaul-pickup',
                address: backhaulJob.pickup.address
            },
            {
                location: backhaulJob.delivery.location.coordinates,
                type: 'backhaul-delivery',
                address: backhaulJob.delivery.address
            }
        );
    }

    return waypoints;
}

/**
 * Calculate estimated fuel cost
 * @param {Number} distance - Distance in meters
 * @param {Number} fuelEfficiency - km per liter
 * @param {Number} fuelPrice - LKR per liter
 * @returns {Number} Estimated cost in LKR
 */
function calculateFuelCost(distance, fuelEfficiency = 8, fuelPrice = 350) {
    const distanceKm = distance / 1000;
    const litersNeeded = distanceKm / fuelEfficiency;
    return Math.round(litersNeeded * fuelPrice);
}

/**
 * Decode Google Maps polyline to coordinates array
 * @param {String} encoded - Encoded polyline
 * @returns {Array} Array of [lng, lat]
 */
function decodePolyline(encoded) {
    const coordinates = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let b;
        let shift = 0;
        let result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        coordinates.push([lng / 1e5, lat / 1e5]); // [lng, lat]
    }

    return coordinates;
}

/**
 * Get optimized route for a job booking
 * Main entry point used by booking API
 * @param {Object} primaryJob 
 * @param {Object} backhaulJob 
 * @param {Number} fuelEfficiency 
 * @param {String} vehicleType - Needed for ORS vehicle profiles
 * @returns {Promise<Object>} Complete route with economics
 */
async function optimizeJobRoute(primaryJob, backhaulJob = null, fuelEfficiency = 8, vehicleType = 'van') {
    const waypoints = buildWaypoints(primaryJob, backhaulJob);
    const route = await getOptimizedRoute(waypoints, { optimize: true }, vehicleType);

    const fuelCost = calculateFuelCost(route.distance, fuelEfficiency);

    return {
        coordinates: route.coordinates,
        distance: route.distance,
        duration: route.duration,
        polyline: route.polyline,
        estimatedFuelCost: fuelCost,
        waypointOrder: waypoints.map(wp => wp.type),
        legs: route.legs
    };
}

module.exports = {
    getOptimizedRoute,
    getDistanceMatrix,
    buildWaypoints,
    calculateFuelCost,
    optimizeJobRoute,
    decodePolyline
};
