import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tripAPI } from '../services/api';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';
import { useFocusEffect } from '@react-navigation/native';

export default function TripsScreen({ navigation }) {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [driverName, setDriverName] = useState('');

    const loadTrips = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const driverDataStr = await AsyncStorage.getItem('driverData');
            
            if (!driverDataStr) {
                console.log('[TripsScreen] No driverData found in storage');
                if (showLoader) setLoading(false);
                return;
            }

            const driverData = JSON.parse(driverDataStr);
            setDriverName(driverData.name || 'Driver');

            // Support both MongoDB _id and virtual id
            const driverId = driverData._id || driverData.id;
            
            if (!driverId) {
                console.error('[TripsScreen] Driver data is missing ID:', driverData);
                Alert.alert('Configuration Error', 'Your profile is missing a valid ID. Please try logging in again.');
                if (showLoader) setLoading(false);
                return;
            }

            console.log(`[TripsScreen] Fetching trips for driver: ${driverId}`);
            const response = await tripAPI.getDriverTrips(driverId);
            
            if (response.data.success) {
                // Keep trips visible while refusal is pending; remove only after reassignment (driver no longer assigned).
                const validTrips = (response.data.trips || []).filter(
                    t => t.status !== 'completed' &&
                        t.status !== 'cancelled'
                );
                
                console.log(`[TripsScreen] Successfully loaded ${validTrips.length} valid trips`);
                setTrips(validTrips);
            } else {
                console.warn('[TripsScreen] API returned success:false', response.data);
                throw new Error(response.data.error || 'API failure');
            }
        } catch (error) {
            console.error('[TripsScreen] Failed to load trips:', error);
            
            let errorMessage = 'Could not load your assigned trips.';
            if (error.code === 'ERR_NETWORK') {
                errorMessage = 'Network error. Please check your connection to the server.';
            } else if (error.response?.status === 500) {
                 errorMessage = 'Server error. Please try again later.';
            }

            Alert.alert('Error', errorMessage);
        } finally {
            if (showLoader) setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadTrips();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadTrips(false);
            const timer = setInterval(() => loadTrips(false), 5000);
            return () => clearInterval(timer);
        }, [loadTrips])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadTrips();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
        return new Date(dateString).toLocaleString('en-US', options);
    };

    const renderTripCard = ({ item }) => {
        const primaryJob = item.primaryJob;

        let distanceKm = '0.0';
        let durationHr = '0.0';
        if (item.route) {
            distanceKm = (item.route.distance / 1000).toFixed(1);
            durationHr = (item.route.duration / 3600).toFixed(1);
        }

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ActiveTrip', { tripId: primaryJob?.jobId || item.jobId || item.tripId, trip: item })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.tripId}>{primaryJob?.jobId || item.jobId || item.tripId}</Text>
                    <View style={[styles.badge, item.status === 'active' ? styles.badgeActive : styles.badgeScheduled]}>
                        <Text style={[styles.badgeText, { color: item.status === 'active' ? '#1D4ED8' : '#B45309' }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {primaryJob && (
                    <View style={styles.cardBody}>
                        <View style={styles.locationContainer}>
                            <View style={styles.locationHeader}>
                                <Text style={styles.label}>PICKUP</Text>
                                <Text style={styles.dateTimeText}>{formatDate(primaryJob.pickup?.datetime)}</Text>
                            </View>
                            <Text style={styles.address} numberOfLines={2}>{primaryJob.pickup?.address}</Text>
                        </View>

                        <View style={styles.spacer} />

                        <View style={styles.locationContainer}>
                            <View style={styles.locationHeader}>
                                <Text style={styles.label}>DELIVERY</Text>
                                <Text style={styles.dateTimeText}>{formatDate(primaryJob.delivery?.datetime)}</Text>
                            </View>
                            <Text style={styles.address} numberOfLines={2}>{primaryJob.delivery?.address}</Text>
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={styles.statCol}>
                                <Text style={styles.label}>DISTANCE</Text>
                                <Text style={styles.statValue}>{distanceKm} km</Text>
                            </View>
                            <View style={styles.statCol}>
                                <Text style={styles.label}>EST. TIME</Text>
                                <Text style={styles.statValue}>{durationHr} h</Text>
                            </View>
                            <View style={styles.statColLarge}>
                                <Text style={styles.label}>PRIMARY CARGO</Text>
                                <Text style={[styles.statValue, { textTransform: 'capitalize' }]}>{primaryJob.cargo?.type || 'General'}</Text>
                                <Text style={styles.statSubValue}>{primaryJob.cargo?.weight}kg / {primaryJob.cargo?.volume}m³</Text>
                            </View>
                        </View>
                    </View>
                )}

                {item.backhaulJob && (
                    <View style={styles.backhaulTag}>
                        <Text style={styles.backhaulText}>+ Includes Return Backhaul</Text>
                    </View>
                )}

                {item.refusalRequest?.requested === true && item.refusalRequest?.status === 'pending' ? (
                    <View style={styles.pendingRefusalTag}>
                        <Text style={styles.pendingRefusalText}>Refusal request pending dispatcher approval</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return <PageLoading fullScreen />;
    }

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome, {driverName}</Text>
            </View>

            <FlatList
                data={trips}
                keyExtractor={(item) => item._id}
                renderItem={renderTripCard}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>You have no assigned trips right now.</Text>
                    </View>
                }
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.bg,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
    },
    welcomeText: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
    },
    listContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F6FA', // bg-primary
    },
    tripId: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        fontFamily: Fonts.semibold,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999, // radius-full
    },
    badgeScheduled: {
        backgroundColor: '#FFFBEB', // status-pending bg
    },
    badgeActive: {
        backgroundColor: '#EFF6FF', // status-active bg
    },
    badgeText: {
        fontSize: 11,
        fontFamily: Fonts.medium,
        letterSpacing: 0.5,
    },
    cardBody: {

    },
    label: {
        fontSize: 11,
        fontFamily: Fonts.bold,
        color: Colors.textTertiary,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    address: {
        fontSize: 14,
        color: Colors.textPrimary,
        fontFamily: Fonts.regular,
        lineHeight: 20,
    },
    spacer: {
        height: 16,
    },
    backhaulTag: {
        marginTop: 16,
        backgroundColor: '#F8F9FB', // bg-tertiary
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    backhaulText: {
        color: '#3B82F6', // text-link
        fontSize: 13,
        fontWeight: '600',
    },
    pendingRefusalTag: {
        marginTop: 10,
        backgroundColor: '#FFF7ED',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FDBA74',
    },
    pendingRefusalText: {
        color: '#C2410C',
        fontSize: 12,
        fontFamily: Fonts.semibold,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.textSecondary,
        fontFamily: Fonts.medium,
        fontSize: 15,
        textAlign: 'center',
    },
    locationContainer: {
        marginBottom: 4,
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    dateTimeText: {
        fontSize: 12,
        color: '#6B7280', // text-secondary
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6', // faint border
    },
    statCol: {
        flex: 1,
    },
    statColLarge: {
        flex: 1.5,
        alignItems: 'flex-end',
    },
    statValue: {
        fontSize: 15,
        fontFamily: Fonts.medium,
        color: Colors.textPrimary,
        marginTop: 2,
    },
    statSubValue: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        marginTop: 2,
    }
});
