import React, { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import { tripCostAPI } from '../../../../services/api';
import { styles } from './economics.styles';

const formatCurrency = (value) => Number(value || 0).toLocaleString();

export default function TripEconomicsAdminScreen() {
    const [loading, setLoading] = useState(true);
    const [tripCosts, setTripCosts] = useState([]);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const response = await tripCostAPI.getSummary();
                setTripCosts(response.data?.costs || []);
            } catch {
                setTripCosts([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <Text style={styles.title}>Trip Economics</Text>
                <Text style={styles.subtitle}>Per-trip fuel, distance, and cost summary</Text>

                <FlatList
                    data={tripCosts}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No trip cost data available yet.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const customerPrice = Number(item.trip?.primaryJob?.pricing?.finalPrice ?? item.trip?.primaryJob?.pricing?.quotedPrice ?? 0);
                        const totalCost = Number(item.calculations?.totalCost ?? 0);
                        const netAmount = customerPrice - totalCost;
                        const statusColor = item.status === 'finalized' ? '#10B981' : '#F59E0B';

                        return (
                            <View style={styles.card}>
                                <View style={styles.rowBetween}>
                                    <Text style={styles.cardTitle}>{item.trip?.primaryJob?.jobId || item.trip?.jobId || item.trip?.tripId || 'N/A'}</Text>
                                    <View style={[styles.badge, { backgroundColor: statusColor }]}>
                                        <Text style={styles.badgeText}>
                                            {String(item.status || 'draft').charAt(0).toUpperCase() + String(item.status || 'draft').slice(1)}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.line}>Vehicle: <Text style={styles.strong}>{item.trip?.vehicle?.registrationNumber || 'N/A'}</Text></Text>
                                <Text style={styles.line}>Driver: <Text style={styles.strong}>{item.driver?.name || 'N/A'}</Text></Text>
                                <Text style={styles.line}>Distance: <Text style={styles.strong}>{item.calculations?.distance || 0} km</Text></Text>
                                <Text style={styles.line}>Efficiency: <Text style={styles.strong}>{item.calculations?.fuelEfficiency || 0} km/L</Text></Text>
                                <Text style={styles.line}>Customer price: <Text style={styles.strong}>Rs {formatCurrency(customerPrice)}</Text></Text>
                                <Text style={styles.line}>Total cost: <Text style={styles.strong}>Rs {formatCurrency(totalCost)}</Text></Text>
                                <Text style={styles.line}>Net amount: <Text style={styles.strong}>Rs {formatCurrency(netAmount)}</Text></Text>
                            </View>
                        );
                    }}
                />
            </View>
        </ScreenWrapper>
    );
}

