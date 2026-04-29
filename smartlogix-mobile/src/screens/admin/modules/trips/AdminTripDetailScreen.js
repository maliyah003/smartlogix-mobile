import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import ThemedPopup from '../../../../components/ThemedPopup';
import { tripAPI } from '../../../../services/api';
import { styles } from './trips.styles';

const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
};

export default function AdminTripDetailScreen({ navigation, route }) {
    const { tripId } = route.params;
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '', buttons: [] });

    const showPopup = (title, message, buttons = null) => {
        setPopup({
            visible: true,
            title,
            message,
            buttons: buttons || [{ label: 'OK', variant: 'primary', onPress: () => setPopup((p) => ({ ...p, visible: false })) }],
        });
    };

    useEffect(() => {
        const loadTrip = async () => {
            try {
                setLoading(true);
                const response = await tripAPI.getTripById(tripId);
                setTrip(response.data?.trip || null);
            } catch (error) {
                setTrip(null);
            } finally {
                setLoading(false);
            }
        };

        loadTrip();
    }, [tripId]);

    const routeCoords = useMemo(() => {
        if (!trip?.route?.coordinates?.length) return [];
        return trip.route.coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
        }));
    }, [trip]);

    const initialRegion = useMemo(() => {
        if (routeCoords.length) {
            return {
                latitude: routeCoords[0].latitude,
                longitude: routeCoords[0].longitude,
                latitudeDelta: 1.2,
                longitudeDelta: 1.2,
            };
        }
        const pickupCoords = trip?.primaryJob?.pickup?.location?.coordinates;
        if (pickupCoords?.length === 2) {
            return {
                latitude: pickupCoords[1],
                longitude: pickupCoords[0],
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
            };
        }
        return {
            latitude: 6.9271,
            longitude: 79.8612,
            latitudeDelta: 2.5,
            longitudeDelta: 2.5,
        };
    }, [routeCoords, trip]);

    const handleDeleteTrip = () => {
        showPopup('Delete trip?', `Delete ${trip?.primaryJob?.jobId || tripId}? The trip assignment will be removed and related resources will be released.`, [
            { label: 'Cancel', variant: 'neutral', onPress: () => setPopup((p) => ({ ...p, visible: false })) },
            {
                label: 'Delete',
                variant: 'danger',
                onPress: async () => {
                    setPopup((p) => ({ ...p, visible: false }));
                    try {
                        setDeleting(true);
                        await tripAPI.deleteTrip(tripId);
                        navigation.goBack();
                    } catch (error) {
                        showPopup('Delete failed', error?.response?.data?.error || 'Unable to delete the trip right now.');
                    } finally {
                        setDeleting(false);
                    }
                },
            },
        ]);
    };

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.detailScroll}>
                <TouchableOpacity style={[styles.actionBtn, { marginTop: 0 }]} onPress={() => navigation.goBack()}>
                    <Text style={styles.actionBtnText}>Back to Trips</Text>
                </TouchableOpacity>
                {trip ? (
                    <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteTrip} disabled={deleting}>
                        <Text style={styles.dangerBtnText}>{deleting ? 'Deleting...' : 'Delete Trip'}</Text>
                    </TouchableOpacity>
                ) : null}

                <Text style={[styles.title, { marginTop: 14 }]}>{trip?.primaryJob?.jobId || tripId}</Text>
                <Text style={styles.subtitle}>Full trip information and route details</Text>

                <View style={styles.mapWrap}>
                    <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
                        <UrlTile
                            urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            maximumZ={19}
                        />

                        {trip?.primaryJob?.pickup?.location?.coordinates?.length === 2 ? (
                            <Marker
                                coordinate={{
                                    latitude: trip.primaryJob.pickup.location.coordinates[1],
                                    longitude: trip.primaryJob.pickup.location.coordinates[0],
                                }}
                                title="Pickup"
                                description={trip.primaryJob.pickup.address}
                            />
                        ) : null}

                        {trip?.primaryJob?.delivery?.location?.coordinates?.length === 2 ? (
                            <Marker
                                coordinate={{
                                    latitude: trip.primaryJob.delivery.location.coordinates[1],
                                    longitude: trip.primaryJob.delivery.location.coordinates[0],
                                }}
                                title="Delivery"
                                description={trip.primaryJob.delivery.address}
                                pinColor="green"
                            />
                        ) : null}

                        {routeCoords.length ? (
                            <Polyline coordinates={routeCoords} strokeColor="#2563EB" strokeWidth={4} />
                        ) : null}
                    </MapView>
                </View>

                <View style={styles.detailCard}>
                    <Text style={styles.detailSectionTitle}>Trip Summary</Text>
                    <Text style={styles.detailText}>Job ID: {trip?.primaryJob?.jobId || trip?.jobId || tripId || 'N/A'}</Text>
                    <Text style={styles.detailText}>Status: {trip?.status || 'N/A'}</Text>
                    <Text style={styles.detailText}>Created: {formatDateTime(trip?.createdAt)}</Text>
                    <Text style={styles.detailText}>Completed: {formatDateTime(trip?.completedAt)}</Text>
                </View>

                <View style={styles.detailCard}>
                    <Text style={styles.detailSectionTitle}>Assignment</Text>
                    <Text style={styles.detailText}>Driver: {trip?.driver?.name || 'Unassigned'}</Text>
                    <Text style={styles.detailText}>Contact: {trip?.driver?.contactNumber || 'N/A'}</Text>
                    <Text style={styles.detailText}>Vehicle: {trip?.vehicle?.registrationNumber || 'Unassigned'}</Text>
                    <Text style={styles.detailText}>Vehicle Type: {trip?.vehicle?.vehicleType || 'N/A'}</Text>
                </View>

                <View style={styles.detailCard}>
                    <Text style={styles.detailSectionTitle}>Primary Job</Text>
                    <Text style={styles.detailText}>Job ID: {trip?.primaryJob?.jobId || 'N/A'}</Text>
                    <Text style={styles.detailText}>Cargo: {trip?.primaryJob?.cargo?.description || 'N/A'}</Text>
                    <Text style={styles.detailText}>
                        Weight / Volume: {trip?.primaryJob?.cargo?.weight || 'N/A'} kg / {trip?.primaryJob?.cargo?.volume || 'N/A'} m3
                    </Text>
                    <Text style={styles.detailText}>Pickup: {trip?.primaryJob?.pickup?.address || 'N/A'}</Text>
                    <Text style={styles.detailText}>Delivery: {trip?.primaryJob?.delivery?.address || 'N/A'}</Text>
                    <Text style={styles.detailText}>Pickup Time: {formatDateTime(trip?.primaryJob?.pickup?.datetime)}</Text>
                </View>

                {trip?.backhaulJob ? (
                    <View style={styles.detailCard}>
                        <Text style={styles.detailSectionTitle}>Backhaul Job</Text>
                        <Text style={styles.detailText}>Job ID: {trip.backhaulJob.jobId || 'N/A'}</Text>
                        <Text style={styles.detailText}>Cargo: {trip.backhaulJob.cargo?.description || 'N/A'}</Text>
                        <Text style={styles.detailText}>Pickup: {trip.backhaulJob.pickup?.address || 'N/A'}</Text>
                        <Text style={styles.detailText}>Delivery: {trip.backhaulJob.delivery?.address || 'N/A'}</Text>
                    </View>
                ) : null}

                <View style={styles.detailCard}>
                    <Text style={styles.detailSectionTitle}>Route Metrics</Text>
                    <Text style={styles.detailText}>
                        Distance: {trip?.route?.distance ? `${(trip.route.distance / 1000).toFixed(1)} km` : 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                        Duration: {trip?.route?.duration ? `${(trip.route.duration / 3600).toFixed(1)} hours` : 'N/A'}
                    </Text>
                    <Text style={styles.detailText}>
                        Estimated Fuel Cost: {trip?.route?.estimatedFuelCost ? `LKR ${trip.route.estimatedFuelCost.toLocaleString()}` : 'N/A'}
                    </Text>
                </View>

                {!trip ? (
                    <View style={styles.empty}>
                        <Ionicons name="alert-circle-outline" size={34} color="#9CA3AF" />
                        <Text style={styles.emptyText}>Trip details could not be loaded.</Text>
                    </View>
                ) : null}
            </ScrollView>
            <ThemedPopup
                visible={popup.visible}
                title={popup.title}
                message={popup.message}
                buttons={popup.buttons}
                onRequestClose={() => setPopup((p) => ({ ...p, visible: false }))}
            />
        </ScreenWrapper>
    );
}
