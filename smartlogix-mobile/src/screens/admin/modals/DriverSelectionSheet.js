import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Shadows } from '../../../theme/ui';

export default function DriverSelectionSheet({ isOpen, drivers, onSelect, onClose, loading }) {
    if (!isOpen) return null;

    return (
        <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select a Driver</Text>
                        <TouchableOpacity onPress={onClose} disabled={loading}>
                            <Ionicons name="close" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {drivers.length > 0 ? (
                            drivers.map((driver) => (
                                <TouchableOpacity
                                    key={driver._id}
                                    style={styles.driverCard}
                                    onPress={() => onSelect(driver._id)}
                                    disabled={loading}
                                >
                                    <View style={styles.driverHeader}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{driver.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.driverName}>{driver.name}</Text>
                                            <Text style={styles.driverMeta}>{driver.experienceLevel}</Text>
                                        </View>
                                        <View style={styles.scoreBox}>
                                            <Text style={styles.scoreLabel}>Safety</Text>
                                            <Text style={[
                                                styles.scoreValue,
                                                { color: driver.safetyScore >= 90 ? Colors.success : Colors.warning }
                                            ]}>
                                                {driver.safetyScore}%
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.driverDetails}>
                                        <View style={styles.detail}>
                                            <Ionicons name="card" size={14} color={Colors.textTertiary} />
                                            <Text style={styles.detailText}>{driver.licenseNumber}</Text>
                                        </View>
                                        <View style={styles.detail}>
                                            <Ionicons name="shield-checkmark" size={14} color={Colors.textTertiary} />
                                            <Text style={styles.detailText}>{driver.status}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => onSelect(driver._id)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.selectButtonText}>
                                            {loading ? 'Processing...' : 'Assign Driver'}
                                        </Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="person-outline" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyStateText}>No drivers available</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
    title: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.textPrimary },
    content: { padding: 16 },
    driverCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, ...Shadows.card },
    driverHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.brandOrange, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontFamily: Fonts.bold, color: '#fff' },
    driverName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.textPrimary },
    driverMeta: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textSecondary, marginTop: 2 },
    scoreBox: { alignItems: 'center' },
    scoreLabel: { fontSize: 10, fontFamily: Fonts.semibold, color: Colors.textTertiary, textTransform: 'uppercase' },
    scoreValue: { fontSize: 14, fontFamily: Fonts.bold, marginTop: 2 },
    driverDetails: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    detail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textSecondary },
    selectButton: { backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    selectButtonText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyStateText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.textSecondary, marginTop: 12 }
});
