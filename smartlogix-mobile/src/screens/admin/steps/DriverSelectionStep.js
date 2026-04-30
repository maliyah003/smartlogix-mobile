import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Shadows } from '../../../theme/ui';

export default function DriverSelectionStep({ drivers, selectedId, onSelect }) {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {drivers.length > 0 ? (
                <View style={styles.list}>
                    {drivers.map((driver) => (
                        <TouchableOpacity
                            key={driver._id}
                            style={[
                                styles.card,
                                selectedId === driver._id && styles.cardSelected
                            ]}
                            onPress={() => onSelect(driver._id)}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.checkBox}>
                                    {selectedId === driver._id && (
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    )}
                                </View>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.name}>{driver.name}</Text>
                                    <Text style={styles.license}>{driver.licenseNumber}</Text>
                                </View>
                                <View style={styles.scoreBox}>
                                    <Text style={styles.scoreLabel}>Safety</Text>
                                    <Text style={[styles.scoreValue, { color: driver.safetyScore >= 90 ? Colors.success : Colors.warning }]}>
                                        {driver.safetyScore}%
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.details}>
                                <View style={styles.detail}>
                                    <Ionicons name="briefcase" size={14} color={Colors.textTertiary} />
                                    <Text style={styles.detailText}>{driver.experienceLevel}</Text>
                                </View>
                                <View style={styles.detail}>
                                    <Ionicons name="checkmark-circle" size={14} color={Colors.textTertiary} />
                                    <Text style={styles.detailText}>{driver.status}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="person-outline" size={48} color={Colors.textTertiary} />
                    <Text style={styles.emptyStateText}>No drivers available</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { display: 'flex', flexDirection: 'column', gap: 12 },
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
    headerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 14,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
    },
    license: {
        fontSize: 11,
        fontFamily: Fonts.medium,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    scoreBox: {
        alignItems: 'flex-end',
    },
    scoreLabel: {
        fontSize: 10,
        fontFamily: Fonts.semibold,
        color: Colors.textTertiary,
        textTransform: 'uppercase',
    },
    scoreValue: {
        fontSize: 12,
        fontFamily: Fonts.bold,
        marginTop: 2,
    },
    details: {
        flexDirection: 'row',
        gap: 12,
    },
    detail: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddyVertical: 6,
        backgroundColor: '#F0F9FF',
        borderRadius: 8,
        paddingVertical: 6,
    },
    detailText: {
        fontSize: 11,
        fontFamily: Fonts.medium,
        color: Colors.textSecondary,
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
