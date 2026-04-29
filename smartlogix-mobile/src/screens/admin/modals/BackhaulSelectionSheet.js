import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Shadows } from '../../../theme/ui';

export default function BackhaulSelectionSheet({ isOpen, backhauls, onSelect, onClose, loading }) {
    if (!isOpen) return null;

    return (
        <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Return Trip</Text>
                        <TouchableOpacity onPress={onClose} disabled={loading}>
                            <Ionicons name="close" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {backhauls && backhauls.length > 0 ? (
                            backhauls.map((backhaul) => (
                                <TouchableOpacity
                                    key={backhaul._id}
                                    style={styles.backhaulCard}
                                    onPress={() => onSelect(backhaul._id)}
                                    disabled={loading}
                                >
                                    <View style={styles.backhaulHeader}>
                                        <View>
                                            <Text style={styles.jobId}>{backhaul.jobId}</Text>
                                            <Text style={styles.cargoInfo}>{backhaul.cargo?.description} ({backhaul.cargo?.weight}kg)</Text>
                                        </View>
                                        {backhaul.score && (
                                            <View style={styles.scoreBadge}>
                                                <Text style={styles.scoreBadgeText}>{backhaul.score}%</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.routeBox}>
                                        <View style={styles.routeStop}>
                                            <Ionicons name="radio-button-on" size={16} color={Colors.success} />
                                            <Text style={styles.routeAddress}>{backhaul.pickup?.address}</Text>
                                        </View>
                                        <View style={styles.routeLine} />
                                        <View style={styles.routeStop}>
                                            <Ionicons name="stop-circle" size={16} color={Colors.danger} />
                                            <Text style={styles.routeAddress}>{backhaul.delivery?.address}</Text>
                                        </View>
                                    </View>

                                    {backhaul.distanceFromDelivery && (
                                        <View style={styles.distanceBox}>
                                            <Ionicons name="navigate" size={14} color={Colors.textTertiary} />
                                            <Text style={styles.distanceText}>
                                                {(backhaul.distanceFromDelivery / 1000).toFixed(1)} km from delivery
                                            </Text>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={styles.selectButton}
                                        onPress={() => onSelect(backhaul._id)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.selectButtonText}>
                                            {loading ? 'Processing...' : 'Select Trip'}
                                        </Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="swap-horizontal" size={48} color={Colors.textTertiary} />
                                <Text style={styles.emptyStateTitle}>No Return Trips</Text>
                                <Text style={styles.emptyStateText}>There are no pending jobs near your delivery location.</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={() => onSelect('skip')}
                            disabled={loading}
                        >
                            <Text style={styles.skipButtonText}>Skip Backhaul</Text>
                        </TouchableOpacity>
                    </View>
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
    content: { padding: 16, paddingBottom: 20 },
    backhaulCard: { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, ...Shadows.card },
    backhaulHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    jobId: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.textPrimary },
    cargoInfo: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textSecondary, marginTop: 4 },
    scoreBadge: { backgroundColor: Colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    scoreBadgeText: { fontSize: 12, fontFamily: Fonts.bold, color: '#fff' },
    routeBox: { backgroundColor: '#F0F9FF', borderRadius: 10, padding: 12, marginBottom: 12 },
    routeStop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    routeAddress: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textSecondary, flex: 1, marginTop: 2 },
    routeLine: { height: 12, width: 1, backgroundColor: '#E5E7EB', marginLeft: 7, marginVertical: 2 },
    distanceBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#FEF3C7', borderRadius: 8, marginBottom: 12 },
    distanceText: { fontSize: 12, fontFamily: Fonts.medium, color: '#92400E' },
    selectButton: { backgroundColor: Colors.brandOrange, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    selectButtonText: { fontSize: 14, fontFamily: Fonts.bold, color: '#fff' },
    emptyState: { alignItems: 'center', paddingVertical: 40 },
    emptyStateTitle: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.textPrimary, marginTop: 12 },
    emptyStateText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
    footer: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.border },
    skipButton: { paddingVertical: 12, alignItems: 'center' },
    skipButtonText: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.link }
});
