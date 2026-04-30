export const buildVehicleMatchPayload = ({ formData, pickupDate, deliveryDate }) => ({
    cargo: {
        weight: parseFloat(formData.cargo.weight),
        volume: parseFloat(formData.cargo.volume),
        description: formData.cargo.description,
        type: formData.cargo.type,
    },
    pickup: {
        coordinates: formData.pickup.coordinates,
        datetime: pickupDate.toISOString(),
    },
    delivery: {
        datetime: deliveryDate.toISOString(),
    },
});

export const buildBookJobPayload = ({ formData, pickupDate, deliveryDate, selectedBackhaulId }) => ({
    cargo: {
        weight: parseFloat(formData.cargo.weight),
        volume: parseFloat(formData.cargo.volume),
        description: formData.cargo.description,
        type: formData.cargo.type,
    },
    pickup: {
        location: { type: 'Point', coordinates: formData.pickup.coordinates },
        address: formData.pickup.address,
        datetime: pickupDate.toISOString(),
    },
    delivery: {
        location: { type: 'Point', coordinates: formData.delivery.coordinates },
        address: formData.delivery.address,
        datetime: deliveryDate.toISOString(),
    },
    pricing: {
        quotedPrice: parseFloat(formData.pricing.quotedPrice),
    },
    customer: formData.customer,
    vehicleId: formData.selectedVehicleId,
    driverId: formData.selectedDriverId,
    selectedBackhaulId,
});
