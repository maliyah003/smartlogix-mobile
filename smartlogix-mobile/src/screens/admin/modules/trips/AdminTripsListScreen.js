import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import ThemedPopup from '../../../../components/ThemedPopup';
import { tripAPI } from '../../../../services/api';
import { styles } from './trips.styles';

const getStatusColor = (status) => {
    if (status === 'completed') return '#10B981';
    if (status === 'active') return '#3B82F6';
    if (status === 'scheduled') return '#8B5CF6';
    if (status === 'cancelled') return '#EF4444';
    return '#F59E0B';
};

export default function AdminTripsListScreen({ navigation }) {
    const [trips, setTrips] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [deletingTripId, setDeletingTripId] = useState(null);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '', buttons: [] });

    const showPopup = (title, message, buttons = null) => {
        setPopup({
            visible: true,
            title,
            message,
            buttons: buttons || [{ label: 'OK', variant: 'primary', onPress: () => setPopup((p) => ({ ...p, visible: false })) }],
        });
    };

    const loadTrips = useCallback(async () => {
        try {
            setLoading(true);
            const response = await tripAPI.getAllTrips();
            setTrips(response.data?.trips || []);
        } catch (error) {
            setTrips([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadTrips();
        }, [loadTrips])
    );

    const filteredTrips = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return trips;
        return trips.filter((trip) =>
            trip.jobId?.toLowerCase().includes(term) ||
            trip.tripId?.toLowerCase().includes(term) ||
            trip.primaryJob?.jobId?.toLowerCase().includes(term) ||
            trip.driver?.name?.toLowerCase().includes(term) ||
            trip.vehicle?.registrationNumber?.toLowerCase().includes(term)
        );
    }, [search, trips]);

    const handleDeleteTrip = useCallback((trip) => {
        showPopup('Delete trip?', `Delete ${trip.primaryJob?.jobId || trip.tripId}? The trip assignment will be removed and related resources will be released.`, [
            { label: 'Cancel', variant: 'neutral', onPress: () => setPopup((p) => ({ ...p, visible: false })) },
            {
                label: 'Delete',
                variant: 'danger',
                onPress: async () => {
                    setPopup((p) => ({ ...p, visible: false }));
                    try {
                        setDeletingTripId(trip.tripId);
                        await tripAPI.deleteTrip(trip.tripId);
                        await loadTrips();
                    } catch (error) {
                        showPopup('Delete failed', error?.response?.data?.error || 'Unable to delete the trip right now.');
                    } finally {
                        setDeletingTripId(null);
                    }
                },
            },
        ]);
    }, [loadTrips]);

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>Trips</Text>
                <Text style={styles.subtitle}>View all trips and open full details</Text>

                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by trip, job, driver, vehicle"
                />

                <FlatList
                    data={filteredTrips}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="trail-sign-outline" size={34} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No trips found.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.tripCard}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.tripId}>{item.primaryJob?.jobId || item.jobId || item.tripId}</Text>
                                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                                    <Text style={styles.badgeText}>{item.status || 'unknown'}</Text>
                                </View>
                            </View>

                            <Text style={styles.metaLine}>
                                {item.primaryJob?.pickup?.address || 'No pickup'} -> {item.primaryJob?.delivery?.address || 'No delivery'}
                            </Text>
                            <Text style={styles.metaLine}>
                                Driver: {item.driver?.name || 'Unassigned'} | Vehicle: {item.vehicle?.registrationNumber || 'Unassigned'}
                            </Text>

                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.halfButton]}
                                    onPress={() => navigation.navigate('AdminTripDetail', { tripId: item.primaryJob?.jobId || item.jobId || item.tripId })}
                                >
                                    <Text style={styles.actionBtnText}>View Full Details</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.dangerBtn, styles.halfButton]}
                                    onPress={() => handleDeleteTrip(item)}
                                    disabled={deletingTripId === item.tripId}
                                >
                                    <Text style={styles.dangerBtnText}>
                                        {deletingTripId === item.tripId ? 'Deleting...' : 'Delete Trip'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </View>
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
