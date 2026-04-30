import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import { tripCostAPI } from '../../../../services/api';
import { styles } from './economics.styles';

export default function FuelConsistencyAdminScreen() {
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const response = await tripCostAPI.getDailyConsistency();
            setReports(response.data?.report || []);
        } catch {
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const metrics = useMemo(() => ({
        activeVehicles: reports.length,
        highVariation: reports.filter((r) => r.status === 'High Variation').length,
    }), [reports]);

    const handleReset = (registrationNumber) => {
        Alert.alert(
            'Reset consistency?',
            `Reset the fuel consistency record for ${registrationNumber}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await tripCostAPI.resetConsistency(registrationNumber);
                            await loadData();
                        } catch (e) {
                            Alert.alert('Error', e.response?.data?.error || 'Failed to reset consistency.');
                        }
                    },
                },
            ]
        );
    };

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>Fuel Consistency</Text>
                <Text style={styles.subtitle}>Consumption variance across the fleet (Past 7 Days)</Text>

                <View style={styles.metricGrid}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Active vehicles (Past 7 Days)</Text>
                        <Text style={styles.metricValue}>{metrics.activeVehicles}</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>High variations</Text>
                        <Text style={styles.metricValue}>{metrics.highVariation}</Text>
                    </View>
                </View>

                <FlatList
                    data={reports}
                    keyExtractor={(item, index) => `${item.vehicleRegistration}-${index}`}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No trips completed in the past 7 days.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const statusColor =
                            item.status === 'High Variation' ? '#EF4444'
                                : item.status === 'Consistent' ? '#10B981'
                                    : '#3B82F6';

                        return (
                            <View style={styles.card}>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.cardTitle}>{item.vehicleRegistration}</Text>
                                    <View style={[styles.badge, { backgroundColor: statusColor }]}>
                                        <Text style={styles.badgeText}>{item.status}</Text>
                                    </View>
                                </View>
                                <Text style={styles.line}>Trips completed: <Text style={styles.strong}>{item.tripsCount}</Text></Text>
                                <Text style={styles.line}>Average consumption: <Text style={styles.strong}>{Number(item.averageConsumption || 0).toFixed(2)} km/L</Text></Text>
                                <Text style={styles.line}>
                                    Variance: <Text style={styles.strong}>
                                        {item.status === 'Insufficient Data' ? '—' : `${Number(item.variance || 0).toFixed(2)} km/L`}
                                    </Text>
                                </Text>

                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleReset(item.vehicleRegistration)}>
                                    <Text style={styles.actionBtnText}>Reset Consistency</Text>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                />
            </View>
        </ScreenWrapper>
    );
}

