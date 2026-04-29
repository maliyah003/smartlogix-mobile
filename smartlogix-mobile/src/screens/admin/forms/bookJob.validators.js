export const isWithinSriLankaBounds = (coords) => {
    const [lng, lat] = coords || [];
    return lat >= 5.91 && lat <= 9.85 && lng >= 79.65 && lng <= 81.89;
};

export const validateCustomerDetails = (customer) => {
    if (!customer?.phone) return 'Customer phone is required.';

    const cleanPhone = customer.phone.replace(/[\s-]/g, '');
    const phoneRegex = /^(?:0|\+94)[1-9]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
        return 'Please enter a valid Sri Lankan phone number.';
    }

    if (customer.email) {
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        if (!emailRegex.test(customer.email)) {
            return 'Please enter a valid email address.';
        }
    }

    return null;
};

export const validateBookingTimeline = (pickupDatetime, deliveryDatetime) => {
    const pickupDate = new Date(pickupDatetime);
    const deliveryDate = new Date(deliveryDatetime);

    if (isNaN(pickupDate.getTime()) || isNaN(deliveryDate.getTime())) {
        return { error: 'Invalid date/time format.' };
    }
    if (deliveryDate < pickupDate) {
        return { error: 'Delivery must be after pickup.' };
    }

    return { pickupDate, deliveryDate, error: null };
};
