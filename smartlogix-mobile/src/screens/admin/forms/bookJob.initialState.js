export const createInitialFormData = () => ({
    cargo: { weight: '', volume: '', description: '', type: 'general' },
    pickup: { coordinates: [79.8612, 6.9271], address: '', datetime: '' },
    delivery: { coordinates: [80.7718, 7.2906], address: '', datetime: '' },
    pricing: { quotedPrice: '' },
    customer: { name: '', phone: '', email: '' },
    selectedVehicleId: null,
    selectedDriverId: null,
});
