import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tripAPI } from '../services/api';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';

export default function ActivityScreen() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadCompletedTrips = async () => {
        try {
            const driverDataStr = await AsyncStorage.getItem('driverData');
            if (driverDataStr) {
                const driverData = JSON.parse(driverDataStr);

                const response = await tripAPI.getDriverTrips(driverData._id);
                if (response.data.success) {
                    // Filter trips that are strictly "completed"
                    const completedTrips = response.data.trips.filter(t => t.status === 'completed');
                    
                    // Sort by completion date/pickup date (newest first)
                    completedTrips.sort((a, b) => {
                        const dateA = new Date(a.primaryJob?.pickup?.datetime || 0);
                        const dateB = new Date(b.primaryJob?.pickup?.datetime || 0);
                        return dateB - dateA;
                    });

                    setTrips(completedTrips);
                }
            }
        } catch (error) {
            console.error('Failed to load activity trips:', error);
            Alert.alert('Error', 'Could not load your completed trips.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCompletedTrips();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadCompletedTrips();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return new Date(dateString).toLocaleString('en-US', options);
    };

    const renderTripCard = ({ item }) => {
        const primaryJob = item.primaryJob;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.tripId}>{primaryJob?.jobId || item.tripId}</Text>
                    <View style={styles.badgeCompleted}>
                        <Text style={styles.badgeTextCompleted}>COMPLETED</Text>
                    </View>
                </View>

                {primaryJob && (
                    <View style={styles.cardBody}>
                        <View style={styles.routeContainer}>
                            <Text style={styles.addressText} numberOfLines={1}>
                                <Text style={{ fontWeight: 'bold' }}>From:</Text> {primaryJob.pickup?.address}
                            </Text>
                            <Text style={styles.addressText} numberOfLines={1}>
                                <Text style={{ fontWeight: 'bold' }}>To:</Text> {primaryJob.delivery?.address}
                            </Text>
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={styles.statCol}>
                                <Text style={styles.label}>DATE</Text>
                                <Text style={styles.statValue}>{formatDate(primaryJob.pickup?.datetime)}</Text>
                            </View>
                            <View style={styles.statCol}>
                                <Text style={styles.label}>CARGO TYPE</Text>
                                <Text style={[styles.statValue, { textTransform: 'capitalize' }]}>{primaryJob.cargo?.type || 'General'}</Text>
                            </View>
                        </View>
                        
                        {item.backhaulJob && (
                            <Text style={styles.backhaulNote}>+ Backhaul Completed</Text>
                        )}
                    </View>
                )}
            </View>
        );
    };

    if (loading && !refreshing) {
        return <PageLoading fullScreen />;
    }

    return (
        <ScreenWrapper>
            <FlatList
                data={trips}
                keyExtractor={(item) => item.tripId}
                renderItem={renderTripCard}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Trip History</Text>
                        <Text style={styles.headerSubtitle}>Your previously completed assignments</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>You haven't completed any trips yet.</Text>
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
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        marginTop: 4,
    },
    listContainer: {
        padding: 16,
        paddingBottom: 40,
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
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F6FA',
    },
    tripId: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textPrimary,
        fontFamily: Fonts.semibold,
    },
    badgeCompleted: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
        backgroundColor: '#DCFCE7', // Tailwind green-100
    },
    badgeTextCompleted: {
        fontSize: 11,
        fontFamily: Fonts.bold,
        color: '#166534', // Tailwind green-800
        letterSpacing: 0.5,
    },
    cardBody: {},
    routeContainer: {
        marginBottom: 16,
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
    },
    addressText: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    statCol: {
        flex: 1,
    },
    statColRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    label: {
        fontSize: 10,
        fontFamily: Fonts.bold,
        color: Colors.textTertiary,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        fontFamily: Fonts.medium,
    },
    earnedValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#059669', // green-600
    },
    backhaulNote: {
        marginTop: 12,
        fontSize: 12,
        fontWeight: '600',
        color: '#3B82F6',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        fontSize: 15,
        textAlign: 'center',
    },
});
