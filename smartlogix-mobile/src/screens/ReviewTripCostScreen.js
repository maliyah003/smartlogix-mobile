import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tripCostAPI, tripAPI } from '../services/api';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';

export default function ReviewTripCostScreen({ route, navigation }) {
    const { tripId, trip, draftData, proofOfDelivery } = route.params;
    
    const [submitting, setSubmitting] = useState(false);
    const [warnings, setWarnings] = useState({});

    // Evaluate soft warnings specifically on this page
    useEffect(() => {
        if (!draftData) return;

        const newWarnings = {};
        
        const distance = draftData.endOdometer - draftData.startOdometer;
        if (distance > 800) {
            newWarnings.finalOdometer = `You marked a distance of ${distance}km. Are you sure this is correct?`;
        }

        const price = draftData.fuelPrice;
        if (price < 270 || price > 500) {
            newWarnings.fuelPrice = `Fuel price Rs ${price}/L is outside the standard expected bounds.`;
        }

        const amt = draftData.litersRefilled;
        if (amt > 100) {
            newWarnings.litersRefilled = `Refilling ${amt}L is very high. Ensure the decimal point is correct.`;
        }

        const park = draftData.parkingFee;
        if (park > 1000) {
            newWarnings.parkingFee = `Parking fee seems unusually high.`;
        }

        const toll = draftData.tollFee;
        if (toll > 4500) {
            newWarnings.tollFee = `Toll fee seems unusually high.`;
        }

        setWarnings(newWarnings);
    }, [draftData]);

    const handleEditDraft = () => {
        navigation.navigate('CompleteTrip', {
            tripId,
            trip,
            initialDraft: draftData,
            proofOfDelivery,
        });
    };

    const handleDeleteDraft = () => {
        Alert.alert(
            "Delete Draft",
            "Are you sure? This will clear all entered expenses but keep the start odometer.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            await tripCostAPI.resetDraft(tripId);
                            Alert.alert("Reset", "Draft wiped successfully.");
                            // Go back with empty draft
                            navigation.navigate('CompleteTrip', {
                                tripId,
                                trip,
                                initialDraft: null,
                                proofOfDelivery,
                            });
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to delete draft.');
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const handleFinalize = async () => {
        setSubmitting(true);
        try {
            if (
                proofOfDelivery?.deliveryPhotoBase64 &&
                proofOfDelivery?.customerSignatureBase64
            ) {
                await tripAPI.saveProofOfDelivery(tripId, {
                    deliveryPhotoBase64: proofOfDelivery.deliveryPhotoBase64,
                    customerSignatureBase64: proofOfDelivery.customerSignatureBase64,
                });
            }

            await tripCostAPI.finalizeTripCost(tripId, draftData);

            // Actually finish the trip logic in backend
            await tripAPI.updateTripStatus(tripId, 'completed');
            
            // Navigate to report screen
            navigation.replace('TripCostReport', { tripId, trip });
        } catch (error) {
            console.error(error);
            Alert.alert("Error", error.response?.data?.error || "Failed to finalize trip.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!draftData) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ fontSize: 16 }}>Missing draft data. Please go back.</Text>
            </View>
        );
    }

    const hasWarnings = Object.keys(warnings).length > 0;

    return (
        <ScreenWrapper>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.content}>
                    
                    <Text style={styles.title}>Review Trip Metrics</Text>
                    <Text style={styles.subtitle}>Please review the data you entered before finalizing.</Text>

                    {proofOfDelivery?.deliveryPhotoBase64 && proofOfDelivery?.customerSignatureBase64 && (
                        <View style={styles.podCard}>
                            <Text style={styles.podTitle}>Proof of delivery</Text>
                            <Text style={styles.podSub}>
                                Delivery photo and customer signature will be saved with this trip.
                            </Text>
                        </View>
                    )}

                    {hasWarnings && (
                        <View style={styles.warningsCard}>
                            <Text style={styles.warningCardTitle}>⚠️ Notice Soft Warnings</Text>
                            <Text style={styles.warningCardSub}>The following values appear irregular, please double check them:</Text>
                            
                            {Object.entries(warnings).map(([key, msg]) => (
                                <View key={key} style={styles.warningItem}>
                                    <Text style={styles.warningDot}>•</Text>
                                    <Text style={styles.warningMsg}>{msg}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.overviewCard}>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Start Odometer</Text>
                            <Text style={styles.rowValue}>{draftData.startOdometer} km</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Final Odometer</Text>
                            <Text style={[styles.rowValue, warnings.finalOdometer && styles.textWarn]}>
                                {draftData.endOdometer} km
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Fuel Price</Text>
                            <Text style={[styles.rowValue, warnings.fuelPrice && styles.textWarn]}>
                                Rs {draftData.fuelPrice} /L
                            </Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Liters Refilled</Text>
                            <Text style={[styles.rowValue, warnings.litersRefilled && styles.textWarn]}>
                                {draftData.litersRefilled} L
                            </Text>
                        </View>
                        
                        {(draftData.parkingFee > 0 || draftData.tollFee > 0) && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.row}>
                                    <Text style={styles.rowLabel}>Misc Fees (Park + Toll)</Text>
                                    <Text style={[styles.rowValue, (warnings.parkingFee || warnings.tollFee) && styles.textWarn]}>
                                        Rs {draftData.parkingFee + draftData.tollFee}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity 
                            style={styles.finalizeBtn} 
                            onPress={handleFinalize}
                            disabled={submitting}
                        >
                            {/* We use fullScreen loading here to prevent interaction */}
                            {submitting && <PageLoading fullScreen backgroundColor="rgba(255,255,255,0.6)" />}
                            <Text style={styles.finalizeBtnText}>Finalize Trip</Text>
                        </TouchableOpacity>

                        <View style={styles.secondaryActions}>
                            <TouchableOpacity 
                                style={styles.editBtn} 
                                onPress={handleEditDraft}
                                disabled={submitting}
                            >
                                <Text style={styles.editBtnText}>Edit Inputs</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.deleteBtn} 
                                onPress={handleDeleteDraft}
                                disabled={submitting}
                            >
                                <Text style={styles.deleteBtnText}>Delete Draft</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        padding: 20
    },
    title: {
        fontSize: 22,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginTop: 10,
        marginBottom: 6
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        marginBottom: 24
    },
    podCard: {
        backgroundColor: '#F3F7FE',
        borderColor: '#E5EDFF',
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 20,
        borderLeftWidth: 5,
        borderLeftColor: Colors.brandOrange,
    },
    podTitle: {
        fontSize: 15,
        fontFamily: Fonts.bold,
        color: '#065F46',
        marginBottom: 4
    },
    podSub: {
        fontSize: 13,
        color: '#047857',
        lineHeight: 18
    },
    warningsCard: {
        backgroundColor: '#FFFBEB',
        borderColor: '#FDE68A',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B'
    },
    warningCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 4
    },
    warningCardSub: {
        fontSize: 14,
        color: '#B45309',
        marginBottom: 12
    },
    warningItem: {
        flexDirection: 'row',
        marginBottom: 6,
        paddingRight: 10
    },
    warningDot: {
        fontSize: 14,
        color: '#D97706',
        marginRight: 6
    },
    warningMsg: {
        fontSize: 14,
        color: '#B45309',
        lineHeight: 20
    },
    overviewCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 20,
        ...Shadows.card,
        marginBottom: 30
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8
    },
    rowLabel: {
        fontSize: 15,
        color: '#4B5563',
        fontFamily: Fonts.medium
    },
    rowValue: {
        fontSize: 16,
        color: '#111827',
        fontFamily: Fonts.bold
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 4
    },
    textWarn: {
        color: '#EF4444'
    },
    actionsContainer: {
        marginTop: 10
    },
    finalizeBtn: {
        backgroundColor: Colors.brandOrange,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: Colors.brandOrange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    finalizeBtnText: {
        color: 'white',
        fontSize: 18,
        fontFamily: Fonts.bold
    },
    secondaryActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12
    },
    editBtn: {
        flex: 1,
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB'
    },
    editBtnText: {
        color: '#374151',
        fontSize: 16,
        fontFamily: Fonts.medium
    },
    deleteBtn: {
        flex: 1,
        backgroundColor: '#FEE2E2',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FCA5A5'
    },
    deleteBtnText: {
        color: '#EF4444',
        fontSize: 16,
        fontFamily: Fonts.bold
    }
});
