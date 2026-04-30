import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { tripCostAPI } from '../services/api';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';

export default function CompleteTripScreen({ route, navigation }) {
    const { tripId, trip, initialDraft, proofOfDelivery } = route.params || {};
    const jobDisplayId = trip?.primaryJob?.jobId || tripId;

    const [finalOdometer, setFinalOdometer] = useState(initialDraft?.endOdometer?.toString() || '');
    const [fuelPrice, setFuelPrice] = useState(initialDraft?.fuelPrice?.toString() || '');
    const [liters, setLiters] = useState(initialDraft?.litersRefilled?.toString() || '');
    const [parking, setParking] = useState(initialDraft?.parkingFee?.toString() || '');
    const [toll, setToll] = useState(initialDraft?.tollFee?.toString() || '');
    
    const [startOdometer, setStartOdometer] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchTripCost = async () => {
            try {
                const res = await tripCostAPI.getTripCost(tripId);

                if (res.data.success && res.data.tripCost) {
                    const cost = res.data.tripCost;
                    setStartOdometer(cost.startOdometer);
                    
                    if (!initialDraft) {
                        if (cost.endOdometer) setFinalOdometer(cost.endOdometer.toString());
                        if (cost.fuelPrice) setFuelPrice(cost.fuelPrice.toString());
                        if (cost.litersRefilled) setLiters(cost.litersRefilled.toString());
                        if (cost.parkingFee) setParking(cost.parkingFee.toString());
                        if (cost.tollFee) setToll(cost.tollFee.toString());
                    }
                }
            } catch (error) {
                console.error("Failed to fetch trip cost draft:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTripCost();
    }, [tripId, initialDraft]);

    const sanitizeNumberInput = (val, maxDecimals = 1) => {
        let sanitized = val.replace(/[eE\+\-]/g, '');
        if (sanitized.length > 1 && sanitized.startsWith('0') && sanitized[1] !== '.') {
            sanitized = sanitized.replace(/^0+/, '');
        }
        const regexStr = `^\\d*\\.?\\d{0,${maxDecimals}}$`;
        const regex = new RegExp(regexStr);
        if (!regex.test(sanitized)) return null; 
        return sanitized;
    };

    // Live Validation check for enabling/disabling the button
    const isFormValid = () => {
        if (!finalOdometer || !fuelPrice || !liters) return false;
        
        const fOdo = parseFloat(finalOdometer);
        const fPrice = parseFloat(fuelPrice);
        const ltrs = parseFloat(liters);
        
        if (isNaN(fOdo) || fOdo <= startOdometer) return false;
        if (isNaN(fPrice) || fPrice < 0) return false;
        if (isNaN(ltrs) || ltrs <= 0) return false;
        
        return true;
    };

    const handleReviewDraft = async () => {
        if (!isFormValid()) return;

        setSubmitting(true);
        try {
            const data = {
                endOdometer: parseFloat(finalOdometer),
                fuelPrice: parseFloat(fuelPrice),
                litersRefilled: parseFloat(liters),
                parkingFee: parking ? parseFloat(parking) : 0,
                tollFee: toll ? parseFloat(toll) : 0,
            };
            
            // Save as draft in backend
            await tripCostAPI.saveDraft(tripId, data);

            navigation.navigate('ReviewTripCost', {
                tripId,
                trip,
                draftData: { ...data, startOdometer },
                proofOfDelivery,
            });
            
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save draft.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <PageLoading fullScreen />;
    }

    const isValid = isFormValid();

    return (
        <ScreenWrapper withKeyboard={true} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
            <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.content}>
                    <View style={styles.headerBox}>
                        <Text style={styles.tripId}>Job ID: {jobDisplayId}</Text>
                        <Text style={styles.startOdo}>Starting Odometer: {startOdometer} km</Text>
                    </View>

                    <Text style={styles.sectionSummary}>Enter Final Trip Metrics</Text>

                    {/* Final Odometer */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Final Odometer (km) *</Text>
                        <TextInput 
                            style={styles.input}
                            keyboardType="numeric"
                            value={finalOdometer}
                            onChangeText={(val) => {
                                const clean = sanitizeNumberInput(val, 1);
                                if (clean !== null) setFinalOdometer(clean);
                            }}
                            placeholder="e.g. 52420.5"
                        />
                        {finalOdometer && parseFloat(finalOdometer) <= startOdometer && (
                            <Text style={styles.errorText}>Must be greater than {startOdometer}</Text>
                        )}
                    </View>

                    {/* Fuel Price */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Fuel Price (Rs/L) *</Text>
                        <TextInput 
                            style={styles.input}
                            keyboardType="numeric"
                            value={fuelPrice}
                            onChangeText={(val) => {
                                const clean = sanitizeNumberInput(val, 2);
                                if (clean !== null) setFuelPrice(clean);
                            }}
                            placeholder="e.g. 350.50"
                        />
                    </View>

                    {/* Liters Refilled */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Liters Refilled (L) *</Text>
                        <TextInput 
                            style={styles.input}
                            keyboardType="numeric"
                            value={liters}
                            onChangeText={(val) => {
                                const clean = sanitizeNumberInput(val, 2);
                                if (clean !== null) setLiters(clean);
                            }}
                            placeholder="e.g. 15.00"
                        />
                    </View>

                    <Text style={[styles.sectionSummary, { marginTop: 16 }]}>Additional Expenses</Text>

                    {/* Parking Fee */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Parking Fee (Rs) [Optional]</Text>
                        <TextInput 
                            style={styles.input}
                            keyboardType="numeric"
                            value={parking}
                            onChangeText={(val) => {
                                const clean = sanitizeNumberInput(val, 2);
                                if (clean !== null) setParking(clean);
                            }}
                            placeholder="e.g. 100.00"
                        />
                    </View>

                    {/* Toll Fee */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Toll Fee (Rs) [Optional]</Text>
                        <TextInput 
                            style={styles.input}
                            keyboardType="numeric"
                            value={toll}
                            onChangeText={(val) => {
                                const clean = sanitizeNumberInput(val, 2);
                                if (clean !== null) setToll(clean);
                            }}
                            placeholder="e.g. 400.00"
                        />
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity 
                            style={[styles.btnPrimary, !isValid && styles.btnDisabled]} 
                            onPress={handleReviewDraft}
                            disabled={!isValid || submitting}
                        >
                            {submitting ? (
                                <PageLoading size={24} color="#fff" />
                            ) : (
                                <Text style={styles.btnPrimaryText}>Save Draft & Review</Text>
                            )}
                        </TouchableOpacity>
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
    scrollContent: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    headerBox: {
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderLeftWidth: 5,
        borderLeftColor: Colors.brandOrange,
        ...Shadows.card,
    },
    tripId: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#111827',
        marginBottom: 4,
    },
    startOdo: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.medium
    },
    sectionSummary: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontFamily: Fonts.medium,
        color: '#374151',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: Colors.textPrimary,
        fontFamily: Fonts.regular,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
        fontFamily: Fonts.medium
    },
    actions: {
        marginTop: 20,
        marginBottom: 40,
    },
    btnPrimary: {
        backgroundColor: Colors.brandOrange,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.brandOrange,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    btnDisabled: {
        backgroundColor: '#9CA3AF',
        shadowOpacity: 0,
        elevation: 0,
    },
    btnPrimaryText: {
        color: Colors.surface,
        fontFamily: Fonts.bold,
        fontSize: 16,
    }
});
