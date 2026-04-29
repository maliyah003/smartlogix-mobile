import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Shadows } from '../../../theme/ui';

export default function BookingSuccessModal({ isOpen, data, onClose }) {
    if (!isOpen || !data) return null;

    return (
        <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Success Icon */}
                        <View style={styles.iconBox}>
                            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>Booking Confirmed!</Text>
                        <Text style={styles.subtitle}>
                            Your job has been successfully booked and a vehicle has been assigned.
                        </Text>

                        {/* Job Details */}
                        <View style={styles.detailsCard}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Job ID</Text>
                                <Text style={styles.detailValue}>{data.job?.jobId}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Trip ID</Text>
                                <Text style={styles.detailValue}>{data.job?.jobId || data.trip?.jobId || data.trip?.tripId}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Status</Text>
                                <Text style={[styles.detailValue, { color: Colors.success }]}>{data.job?.status}</Text>
                            </View>
                        </View>

                        {/* Vehicle Info */}
                        {data.vehicle && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name="car" size={20} color={Colors.brandOrange} />
                                    <Text style={styles.infoTitle}>Vehicle Assigned</Text>
                                </View>
                                <View style={styles.infoDetail}>
                                    <Text style={styles.infoLabel}>Registration</Text>
                                    <Text style={styles.infoValue}>{data.vehicle.registrationNumber}</Text>
                                </View>
                                <View style={styles.infoDetail}>
                                    <Text style={styles.infoLabel}>Type</Text>
                                    <Text style={styles.infoValue}>{data.vehicle.type}</Text>
                                </View>
                                <View style={styles.infoDetail}>
                                    <Text style={styles.infoLabel}>Match Score</Text>
                                    <Text style={[styles.infoValue, { color: Colors.brandOrange }]}>
                                        {data.vehicle.matchScore}%
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Driver Info */}
                        {data.driver && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name="person" size={20} color={Colors.success} />
                                    <Text style={styles.infoTitle}>Driver Assigned</Text>
                                </View>
                                <View style={styles.infoDetail}>
                                    <Text style={styles.infoLabel}>Name</Text>
                                    <Text style={styles.infoValue}>{data.driver.name}</Text>
                                </View>
                                <View style={styles.infoDetail}>
                                    <Text style={styles.infoLabel}>Contact</Text>
                                    <Text style={styles.infoValue}>{data.driver.contactNumber}</Text>
                                </View>
                            </View>
                        )}

                        {/* Route Info */}
                        {data.route && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name="navigate" size={20} color={Colors.link} />
                                    <Text style={styles.infoTitle}>Route Details</Text>
                                </View>
                                <View style={styles.infoDetail}>
                                    <Text style={styles.infoLabel}>Distance</Text>
                                    <Text style={styles.infoValue}>{data.route.distance}</Text>
                                </View>
                                <View style={styles.infoDetail}>
                                    <Text style={styles.infoLabel}>Estimated Duration</Text>
                                    <Text style={styles.infoValue}>{data.route.duration}</Text>
                                </View>
                                {data.route.estimatedFuelCost && (
                                    <View style={styles.infoDetail}>
                                        <Text style={styles.infoLabel}>Fuel Cost</Text>
                                        <Text style={styles.infoValue}>{data.route.estimatedFuelCost}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Backhaul */}
                        {data.backhaul && (
                            <View style={[styles.infoCard, styles.backhaulCard]}>
                                <View style={styles.infoHeader}>
                                    <Ionicons name="swap-horizontal" size={20} color="#7C3AED" />
                                    <Text style={styles.infoTitle}>Return Trip Included</Text>
                                </View>
                                <Text style={styles.backhaulText}>
                                    A backhaul has been coordinated, reducing empty return costs.
                                </Text>
                                <View style={styles.infoDetail}>
                                    <Text style={styles.infoLabel}>Savings</Text>
                                    <Text style={[styles.infoValue, { color: Colors.success }]}>
                                        {data.backhaul.savings}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modal: { backgroundColor: Colors.surface, borderRadius: 20, maxHeight: '85%', ...Shadows.card },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
    iconBox: { alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    detailsCard: { backgroundColor: '#F0F9FF', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    detailLabel: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.textSecondary },
    detailValue: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.textPrimary },
    divider: { height: 1, backgroundColor: '#BFDBFE', marginVertical: 4 },
    infoCard: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    backhaulCard: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    infoTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.textPrimary },
    infoDetail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 },
    infoLabel: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.textSecondary },
    infoValue: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.textPrimary },
    backhaulText: { fontSize: 13, fontFamily: Fonts.regular, color: '#6B21A8', marginBottom: 10, lineHeight: 18 },
    closeButton: { backgroundColor: Colors.brandOrange, marginHorizontal: 20, marginBottom: 14, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    closeButtonText: { fontSize: 16, fontFamily: Fonts.bold, color: '#fff' }
});
