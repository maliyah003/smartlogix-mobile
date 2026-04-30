import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { tripCostAPI } from '../services/api';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';

export default function TripCostReportScreen({ route, navigation }) {
    const { tripId, trip } = route.params;
    const jobDisplayId = trip?.primaryJob?.jobId || tripId;
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await tripCostAPI.getTripCost(tripId);

                if (res.data.success && res.data.tripCost) {
                    setReport(res.data.tripCost);
                }
            } catch (error) {
                console.error("Failed to fetch report:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [tripId]);

    if (loading) {
        return <PageLoading fullScreen />;
    }

    if (!report) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>Report not found</Text>
                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MainTabs')}>
                    <Text style={styles.buttonText}>Return to Dashboard</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const { calculations } = report;

    return (
        <ScreenWrapper>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Trip Completed</Text>
                    <Text style={styles.headerSubtitle}>{jobDisplayId}</Text>
                </View>

                {/* Badges Section */}
                <View style={styles.metricsContainer}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Distance</Text>
                        <Text style={styles.metricValue}>{calculations.distance} km</Text>
                    </View>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Fuel Efficiency</Text>
                        <Text style={styles.metricValue}>{calculations.fuelEfficiency} km/L</Text>
                    </View>
                </View>

                <View style={styles.metricsContainer}>
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Fuel Cost</Text>
                        <Text style={styles.metricValue}>Rs {calculations.fuelCost}</Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                        <Text style={[styles.metricLabel, { color: '#4338CA' }]}>Total Cost</Text>
                        <Text style={[styles.metricValue, { color: '#4338CA' }]}>Rs {calculations.totalCost}</Text>
                    </View>
                </View>

                {/* Breakdown Table */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Expense Breakdown</Text>
                    
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Odometer start → end</Text>
                        <Text style={styles.rowValue}>{report.startOdometer} to {report.endOdometer}</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Fuel Logistics</Text>
                        <Text style={styles.rowValue}>{report.litersRefilled}L @ Rs {report.fuelPrice}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Fuel Cost</Text>
                        <Text style={styles.rowValue}>Rs {calculations.fuelCost}</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Parking Fee</Text>
                        <Text style={styles.rowValue}>Rs {report.parkingFee}</Text>
                    </View>
                    
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Toll Fee</Text>
                        <Text style={styles.rowValue}>Rs {report.tollFee}</Text>
                    </View>

                    <View style={styles.divider} />
                    
                    <View style={styles.row}>
                        <Text style={[styles.rowLabel, styles.totalText]}>Total Accrued Cost</Text>
                        <Text style={[styles.rowValue, styles.totalText]}>Rs {calculations.totalCost}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('MainTabs')}>
                    <Text style={styles.buttonText}>Return to Dashboard</Text>
                </TouchableOpacity>
                
                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        padding: 16,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: Colors.brandOrange,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        marginTop: 4,
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        ...Shadows.card,
    },
    metricLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontFamily: Fonts.medium,
        textTransform: 'uppercase',
    },
    metricValue: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#111827',
        marginTop: 8,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        ...Shadows.card,
    },
    cardTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#111827',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    rowLabel: {
        fontSize: 14,
        color: '#4B5563',
    },
    rowValue: {
        fontSize: 14,
        fontFamily: Fonts.medium,
        color: '#111827',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    totalText: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: '#111827',
    },
    successBorder: {
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    warningBorder: {
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
    },
    neutralBorder: {
        borderLeftWidth: 4,
        borderLeftColor: '#9CA3AF',
    },
    consistencyStatus: {
        fontSize: 14,
        fontFamily: Fonts.bold,
        color: '#111827',
        marginBottom: 4,
    },
    consistencyMessage: {
        fontSize: 14,
        color: '#4B5563',
    },
    button: {
        backgroundColor: Colors.brandOrange,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        ...Shadows.card,
    },
    buttonText: {
        color: Colors.surface,
        fontFamily: Fonts.bold,
        fontSize: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        marginBottom: 16,
    }
});
