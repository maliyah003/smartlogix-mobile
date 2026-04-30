import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Shadows } from '../../../theme/ui';

export default function VehicleSelectionSheet({ isOpen, vehicles, onSelect, onClose, loading }) {
    if (!isOpen) return null;

    return (
        <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select a Vehicle</Text>
                        <TouchableOpacity onPress={onClose} disabled={loading}>
                            <Ionicons name="close" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {vehicles.length > 0 ? (
                            vehicles.map((vehicle) => (
                                <TouchableOpacity
                                    key={vehicle._id}
                                    style={styles.vehicleCard}
                                    onPress={() => onSelect(vehicle._id)}
                                    disabled={loading}
                                >
                                    <View style={styles.vehicleHeader}>
                                        <Text style={styles.vehicleName}>{vehicle.registrationNumber}</Text>
                                        <Text style={[
                                            styles.score,
                                            { color: vehicle.score > 80 ? Colors.success : Colors.warning }
                                        ]}>
                                            {vehicle.score}%
                                        </Text>
                                    </View>
                                    <View style={styles.vehicleDetails}>
                                        <View style={styles.detail}>
                                            <Ionicons name="cube" size={16} color={Colors.textSecondary} />
                                            <Text style={styles.detailText}>{vehicle.capacity.weight}kg / {vehicle.capacity.volume}m³</Text>
                                        </View>
                                        <View style={styles.detail}>
                                            <Ionicons name="car" size={16} color={Colors.textSecondary} />
                                            <Text style={styles.detailText}>{vehicle.vehicleType}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => onSelect(vehicle._id)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.selectButtonText}>
                                            {loading ? 'Processing...' : 'Select'}
                                        </Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyStateText}>No vehicles found</Text>
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
    vehicleCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, ...Shadows.card },
    vehicleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    vehicleName: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.textPrimary },
    score: { fontSize: 14, fontFamily: Fonts.bold },
    vehicleDetails: { gap: 8, marginBottom: 12 },
    detail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textSecondary },
    selectButton: { backgroundColor: Colors.brandOrange, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    selectButtonText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyStateText: { fontSize: 14, fontFamily: Fonts.medium, color: Colors.textSecondary, marginTop: 12 }
});
