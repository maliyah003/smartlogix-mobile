import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import { tripAPI } from '../../../../services/api';
import { styles } from './tripRefusals.styles';

export default function TripRefusalsScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [trips, setTrips] = useState([]);
    const [processingId, setProcessingId] = useState(null);

    const loadRefusals = useCallback(async () => {
        try {
            setLoading(true);
            const res = await tripAPI.getAllTrips();
            const all = res.data?.trips || [];
            const pending = all.filter(
                (t) => t.refusalRequest?.requested === true && t.refusalRequest?.status === 'pending'
            );
            setTrips(pending);
        } catch (e) {
            setTrips([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRefusals();
    }, [loadRefusals]);


    const handleReject = (trip) => {
        Alert.alert('Reject refusal?', 'The driver will be required to complete the trip.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setProcessingId(trip.tripId);
                        await tripAPI.rejectRefusal(trip.tripId);
                        await loadRefusals();
                    } catch (e) {
                        Alert.alert('Error', e.response?.data?.error || 'Failed to reject refusal.');
                    } finally {
                        setProcessingId(null);
                    }
                },
            },
        ]);
    };

    useEffect(() => {
        const unsub = navigation.addListener('focus', loadRefusals);
        return unsub;
    }, [navigation, loadRefusals]);

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.titleRow}>
                    <View>
                        <Text style={styles.title}>Trip Refusals</Text>
                        <Text style={styles.subtitle}>Review and handle driver refusal requests</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{trips.length} Pending</Text>
                    </View>
                </View>

                <FlatList
                    data={trips}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="checkmark-circle-outline" size={36} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No pending refusal requests.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{item.primaryJob?.jobId || item.jobId || item.tripId}</Text>
                            <Text style={styles.line}>Job ID: {item.primaryJob?.jobId || item.jobId || item.tripId}</Text>
                            <Text style={styles.line}>Vehicle: {item.vehicle?.registrationNumber || '—'}</Text>
                            <Text style={styles.line}>Driver: {item.driver?.name || '—'}</Text>
                            <View style={styles.reasonBox}>
                                <Text style={styles.reasonLabel}>Refusal reason</Text>
                                <Text style={styles.reasonText}>"{item.refusalRequest?.reason || '—'}"</Text>
                            </View>

                            <View style={styles.actionsRow}>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnReject]}
                                    onPress={() => handleReject(item)}
                                    disabled={processingId === item.tripId}
                                >
                                    <Text style={styles.btnText}>{processingId === item.tripId ? '...' : 'Reject'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.btnApprove]}
                                    onPress={() => navigation.navigate('TripRefusalAssign', { trip: item })}
                                    disabled={processingId === item.tripId}
                                >
                                    <Text style={styles.btnText}>{processingId === item.tripId ? '...' : 'Accept'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </View>

        </ScreenWrapper>
    );
}

