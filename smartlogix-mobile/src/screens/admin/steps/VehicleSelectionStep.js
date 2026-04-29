import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Shadows } from '../../../theme/ui';

const isVehicleNonCompliant = (vehicle, thresholdDays = 3) => {
    const status = String(vehicle?.status || '').toLowerCase();
    if (status === 'out of service' || status === 'out-of-service' || status === 'offline') return true;

    const now = new Date();
    const toDays = (d) => {
        if (!d) return null;
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return null;
        return Math.ceil((dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };
    const lic = toDays(vehicle?.licenseEndDate);
    const ins = toDays(vehicle?.insuranceEndDate);
    const licRisk = typeof lic === 'number' && lic <= thresholdDays;
    const insRisk = typeof ins === 'number' && ins <= thresholdDays;
    return licRisk || insRisk;
};

export default function VehicleSelectionStep({ vehicles, selectedId, onSelect }) {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {vehicles.length > 0 ? (
                <View style={styles.grid}>
                    {vehicles.map((vehicle) => {
                        const nonCompliant = isVehicleNonCompliant(vehicle);
                        const disabled = nonCompliant;
                        return (
                        <TouchableOpacity
                            key={vehicle._id}
                            style={[
                                styles.card,
                                selectedId === vehicle._id && styles.cardSelected,
                                disabled && styles.cardDisabled,
                            ]}
                            onPress={() => {
                                if (!disabled) onSelect(vehicle._id);
                            }}
                            disabled={disabled}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.checkBox}>
                                    {selectedId === vehicle._id && (
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    )}
                                </View>
                                <Text style={styles.registration}>{vehicle.registrationNumber}</Text>
                                {nonCompliant ? (
                                    <View style={styles.riskChip}>
                                        <Text style={styles.riskChipText}>Out of service</Text>
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.details}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="car" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>{vehicle.vehicleType}</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Ionicons name="cube" size={16} color={Colors.textSecondary} />
                                    <Text style={styles.detailText}>
                                        {vehicle.capacity.weight}kg / {vehicle.capacity.volume}m³
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.score}>
                                <Text style={styles.scoreLabel}>Match Score</Text>
                                <Text style={[styles.scoreValue, { color: vehicle.score > 80 ? Colors.success : Colors.warning }]}>
                                    {vehicle.score}%
                                </Text>
                            </View>
                        </TouchableOpacity>
                        );
                    })}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
                    <Text style={styles.emptyStateText}>No vehicles available</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    grid: { display: 'flex', flexDirection: 'column', gap: 12 },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    cardSelected: {
        backgroundColor: '#FFF8F0',
        borderColor: Colors.brandOrange,
        borderWidth: 1.5,
    },
    cardDisabled: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
        opacity: 0.7,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    checkBox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    registration: {
        fontSize: 15,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        flex: 1,
    },
    riskChip: {
        backgroundColor: '#DC2626',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    riskChipText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: Fonts.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    details: {
        gap: 8,
        marginBottom: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 12,
        fontFamily: Fonts.medium,
        color: Colors.textSecondary,
    },
    score: {
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scoreLabel: {
        fontSize: 11,
        fontFamily: Fonts.semibold,
        color: Colors.textSecondary,
    },
    scoreValue: {
        fontSize: 13,
        fontFamily: Fonts.bold,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 14,
        fontFamily: Fonts.medium,
        color: Colors.textSecondary,
        marginTop: 12,
    }
});
