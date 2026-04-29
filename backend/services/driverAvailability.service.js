const Driver = require('../models/driver.model');
const Trip = require('../models/trip.model');

/**
 * Calculates which drivers are available by checking their schedules
 * against the provided job timeframe. It subtracts any drivers who
 * have overlapping scheduled or active trips.
 *
 * @param {string} pickupDatetime - ISO string of the pickup time
 * @param {string} deliveryDatetime - ISO string of the delivery time
 * @returns {Promise<Array>} List of available driver objects
 */
exports.getAvailableDrivers = async (pickupDatetime, deliveryDatetime) => {
    // Step 1: Get drivers who are not explicitly off-duty
    const potentialDrivers = await Driver.find({ status: { $nin: ['off-duty'] } }).sort({ safetyScore: -1 });

    if (!pickupDatetime) {
        // Fallback: If no datetimes provided, return all potential drivers
        return potentialDrivers;
    }

    const newJobStart = new Date(pickupDatetime);
    // Default to 4 hours if delivery time is missing
    const newJobEnd = deliveryDatetime ? new Date(deliveryDatetime) : new Date(newJobStart.getTime() + (4 * 60 * 60 * 1000));

    // Buffer to ensure driver has time to travel between jobs (3 hours)
    const bufferMs = 3 * 60 * 60 * 1000;
    const searchStart = new Date(newJobStart.getTime() - bufferMs);
    const searchEnd = new Date(newJobEnd.getTime() + bufferMs);

    const driverIds = potentialDrivers.map(d => d._id);

    // Step 2: Identify which drivers are busy during this specific time window
    const overlappingTrips = await Trip.find({
        driver: { $in: driverIds },
        status: { $in: ['scheduled', 'active'] }
    }).populate('primaryJob backhaulJob');

    const busyDriverIds = new Set();

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
                if (trip.driver) {
                    busyDriverIds.add(trip.driver.toString());
                }
            }
        }
    });

    // Step 3: Filter down to truly available drivers
    const availableDrivers = potentialDrivers.filter(d => !busyDriverIds.has(d._id.toString()));

    return availableDrivers;
};
