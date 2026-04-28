import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getBaseUrl = () => {
    // 1. Explicit environment variable priority
    const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
    if (configuredUrl) return configuredUrl;

    const configuredPort = process.env.EXPO_PUBLIC_API_PORT || '5003';
    
    // 2. Try various Expo manifest versions for hostUri
    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest?.hostUri ||
        Constants.manifest2?.extra?.expoClient?.hostUri ||
        Constants.experienceLoaderConfig?.hostUri;

    if (hostUri) {
        // Strip the port and query params from hostUri if present
        const host = hostUri.split(':')[0];
        console.log(`[API] Resolved host from Expo: ${host}`);
        return `http://${host}:${configuredPort}`;
    }

    // 3. Platform-specific fallbacks (emulators)
    if (Platform.OS === 'android') {
        console.log(`[API] Using Android emulator loopback: 10.0.2.2:${configuredPort}`);
        return `http://10.0.2.2:${configuredPort}`;
    }

    console.log(`[API] Defaulting to localhost:${configuredPort}`);
    return `http://localhost:${configuredPort}`;
};

const BASE_URL = getBaseUrl();

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Automatically inject JWT token into all requests
api.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem('driverToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (e) {
        console.error('Error fetching token from storage', e);
    }
    return config;
});

export const authAPI = {
    checkStatus: (email) => api.post('/api/drivers/check-status', { email }),
    login: (email, password) => api.post('/api/drivers/login', { email, password }),
};

export const driverAPI = {
    getMonthlyScore: (driverId, params = {}) => api.get(`/api/drivers/${driverId}/score`, { params }),
    getAll: () => api.get('/api/drivers'),
    getById: (driverId) => api.get(`/api/drivers/${driverId}`),
    getAvailable: (params = {}) => api.get('/api/drivers/available', { params }),
    create: (payload) => api.post('/api/drivers', payload),
    update: (driverId, payload) => api.put(`/api/drivers/${driverId}`, payload),
    delete: (driverId) => api.delete(`/api/drivers/${driverId}`),
    changePassword: (driverId, payload) => api.post(`/api/drivers/${driverId}/change-password`, payload),
    getScore: (driverId, params = {}) => api.get(`/api/drivers/${driverId}/score`, { params }),
    getIncidents: (driverId, params = {}) => api.get(`/api/drivers/${driverId}/incidents`, { params }),
    addIncident: (driverId, payload) => api.post(`/api/drivers/${driverId}/incidents`, payload),
};

export const vehicleAPI = {
    getAll: () => api.get('/api/vehicles'),
    getById: (vehicleId) => api.get(`/api/vehicles/${vehicleId}`),
    create: (payload) => api.post('/api/vehicles', payload),
    update: (vehicleId, payload) => api.put(`/api/vehicles/${vehicleId}`, payload),
    delete: (vehicleId) => api.delete(`/api/vehicles/${vehicleId}`),
};

export const tripAPI = {
    getAllTrips: () => api.get('/api/trips'),
    getTripById: (tripId) => api.get(`/api/trips/${tripId}`),
    getDriverTrips: (driverId) => api.get(`/api/trips/driver/${driverId}`),
    updateTripStatus: (tripId, status) => api.patch(`/api/trips/${tripId}/status`, { status }),
    updatePosition: (tripId, longitude, latitude) => api.post(`/api/trips/${tripId}/position`, { longitude, latitude }),
    refuseTrip: (tripId, reason) => api.post(`/api/trips/${tripId}/refuse`, { reason }),
    approveRefusal: (tripId, payload) => api.post(`/api/trips/${tripId}/refuse/approve`, payload),
    rejectRefusal: (tripId) => api.post(`/api/trips/${tripId}/refuse/reject`),
    deleteTrip: (tripId) => api.delete(`/api/trips/${tripId}`),
    saveProofOfDelivery: (tripId, payload) =>
        api.patch(`/api/proof-of-delivery/trip/${tripId}`, payload),
};

export const proofOfDeliveryAPI = {
    getAll: (params = {}) => api.get('/api/proof-of-delivery', { params }),
    getByTrip: (tripId) => api.get(`/api/proof-of-delivery/trip/${tripId}`),
};

export const jobAPI = {
    getJobById: (jobId) => api.get(`/api/jobs/${jobId}`),
    matchVehicles: (payload) => api.post('/api/jobs/match', payload),
    getAvailableDrivers: (params) => api.get('/api/drivers/available', { params }),
    getBackhauls: (params) => api.get('/api/jobs/backhaul', { params }),
    bookJob: (payload) => api.post('/api/jobs/book', payload)
};

export const customerPortalAPI = {
    trackShipment: (trackingId) => api.get(`/api/customer-portal/track/${trackingId}`),
    updateDeliveryNote: (jobId, note) => api.patch(`/api/customer-portal/notes/${jobId}`, { note }),
};

export const notificationAPI = {
    getNotifications: (params = {}) => api.get('/api/notifications', { params }),
    getDriverNotifications: (driverId) => api.get(`/api/notifications?driverId=${driverId}`),
    markAsRead: (id) => api.patch(`/api/notifications/${id}/read`),
};

export const tripCostAPI = {
    getSummary: () => api.get('/api/trip-costs/summary'),
    getDailyConsistency: () => api.get('/api/trip-costs/admin/daily-consistency'),
    resetConsistency: (registrationNumber) => api.post(`/api/trip-costs/admin/reset-consistency/${registrationNumber}`),
    getTripCost: (tripId) => api.get(`/api/trip-costs/${tripId}`),
    startTripCost: (tripId, driverId, startOdometer) => api.post('/api/trip-costs/start', { tripId, driverId, startOdometer }),
    saveDraft: (tripId, data) => api.post('/api/trip-costs/draft', { tripId, ...data }),
    resetDraft: (tripId) => api.delete(`/api/trip-costs/${tripId}/draft`),
    finalizeTripCost: (tripId, data) => api.post('/api/trip-costs/finalize', { tripId, ...data })
};
