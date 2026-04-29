import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Platform, Modal, TextInput } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import SwipeButton from '../components/SwipeButton';
import { tripAPI, tripCostAPI, jobAPI } from '../services/api';
import { Colors, Fonts } from '../theme/ui';
import PageLoading from '../components/PageLoading';
// NOTE: EXPO GPS tracking requires 'expo-location', we will mock this or install it later if requested

export default function ActiveTripScreen({ route, navigation }) {
    const { tripId, trip } = route.params;
    const jobDisplayId = trip?.primaryJob?.jobId || tripId;
    const [status, setStatus] = useState(trip?.status || 'scheduled');
    const [loading, setLoading] = useState(false);
    const [refusalModalVisible, setRefusalModalVisible] = useState(false);
    const [refusalReason, setRefusalReason] = useState('');
    const [startOdoModalVisible, setStartOdoModalVisible] = useState(false);
    const [startOdometer, setStartOdometer] = useState('');
    const locationSubscription = useRef(null);
    const startSwipeRef = useRef(null);
    const completeSwipeRef = useRef(null);

    // Customer Note State
    const [customerNote, setCustomerNote] = useState(trip?.primaryJob?.specialInstructions || '');
    const [showNoteModal, setShowNoteModal] = useState(false);

    // Cleanup subscription on unmount
    useEffect(() => {
        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    // RTDB / Polling for Customer Notes
    useEffect(() => {
        const jobId = trip?.primaryJob?.jobId;
        if (!jobId) return;

        const pollNote = async () => {
            try {
                const res = await jobAPI.getJobById(jobId);
                if (res.data?.success && res.data?.job?.specialInstructions !== undefined) {
                    setCustomerNote(res.data.job.specialInstructions);
                }
            } catch (err) {
                // Background polling error ignored
            }
        };

        const interval = setInterval(pollNote, 10000);
        return () => clearInterval(interval);
    }, [trip]);

    // Grab coordinates from the backend Trip data structure
    const mapRegion = {
        latitude: trip?.primaryJob?.pickup?.location?.coordinates[1] || 51.5074,
        longitude: trip?.primaryJob?.pickup?.location?.coordinates[0] || -0.1278,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    const openNativeNavigation = () => {
        const destLat = trip?.primaryJob?.delivery?.location?.coordinates[1];
        const destLng = trip?.primaryJob?.delivery?.location?.coordinates[0];

        if (!destLat || !destLng) {
            Alert.alert('Error', 'Destination coordinates not available for navigation.');
            return;
        }

        const url = Platform.select({
            ios: `comgooglemaps://?daddr=${destLat},${destLng}&directionsmode=driving`,
            android: `google.navigation:q=${destLat},${destLng}`
        });

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                // Fallback to web browser if Google Maps app is not installed
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`);
            }
        }).catch(() => {
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`);
        });
    };

    const handleAcceptTrip = async () => {
        setLoading(true);
        try {
            // Open Start Odometer Modal instead of directly starting
            setStartOdoModalVisible(true);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to prompt start odometer.');
            startSwipeRef.current?.reset();
        } finally {
            setLoading(false);
        }
    };

    const confirmStartTrip = async () => {
        const odoValue = startOdometer.trim();

        // Basic check for scientific notation chars
        if (/[eE\+\-]/.test(odoValue)) {
            Alert.alert('Invalid Input', 'Scientific notation or negative signs are not allowed.');
            return;
        }

        // Validate Regex
        if (!/^\d*\.?\d{0,1}$/.test(odoValue) || !odoValue) {
            Alert.alert('Invalid Input', 'Enter a valid positive number (max 1 decimal).');
            return;
        }

        // Logical Validation
        const parsedOdo = parseFloat(odoValue);
        if (parsedOdo < 0) {
            Alert.alert('Invalid Input', 'Odometer cannot be negative.');
            return;
        }

        setLoading(true);
        try {
            const driverId = trip?.driver?._id || trip?.driver; // Fallback to trip driver info
            await tripCostAPI.startTripCost(tripId, driverId, parsedOdo);

            await tripAPI.updateTripStatus(tripId, 'active');
            setStatus('active');
            setStartOdoModalVisible(false);

            // Request location tracking
            const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
            if (locationStatus === 'granted') {
                const sub = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5000,
                        distanceInterval: 10
                    },
                    (loc) => {
                        tripAPI.updatePosition(tripId, loc.coords.longitude, loc.coords.latitude)
                            .catch(err => console.error("Position sync failed:", err));
                    }
                );
                locationSubscription.current = sub;
            } else {
                Alert.alert('Notice', 'Location permissions denied. Real-time tracking is disabled.');
            }

            openNativeNavigation(); // Immediately start native navigation
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to start trip.');
            startSwipeRef.current?.reset();
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTrip = async () => {
        setLoading(true);
        try {
            // 1km Geofence Check (TEMPORARILY DISABLED)
            /*
            const destLat = trip?.primaryJob?.delivery?.location?.coordinates[1];
            const destLng = trip?.primaryJob?.delivery?.location?.coordinates[0];

            if (destLat && destLng) {
                const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const curLat = currentLoc.coords.latitude;
                const curLng = currentLoc.coords.longitude;

                const toRad = (value) => (value * Math.PI) / 180;
                const R = 6371e3; // Earth's radius in metres
                const phi1 = toRad(curLat);
                const phi2 = toRad(destLat);
                const deltaPhi = toRad(destLat - curLat);
                const deltaLambda = toRad(destLng - curLng);

                const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                    Math.cos(phi1) * Math.cos(phi2) *
                    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;

                if (distance > 500) {
                    Alert.alert('Notice', `You must be within 500m of the destination to complete the trip.\n\nCurrently ${(distance / 1000).toFixed(1)}km away.`);
                    completeSwipeRef.current?.reset();
                    setLoading(false);
                    return;
                }
            }
            */

            // Proof of delivery first, then final readings (CompleteTrip) → Review → report
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }

            navigation.navigate('ProofOfDelivery', { tripId, trip });

            // Reset swipe when returning (e.g. from proof / inputs flow).
            completeSwipeRef.current?.reset();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to complete trip.');
            completeSwipeRef.current?.reset();
        } finally {
            setLoading(false);
        }
    };

    const handleRefuseTrip = async () => {
        if (!refusalReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for refusing this trip.');
            return;
        }

        setLoading(true);
        try {
            const response = await tripAPI.refuseTrip(tripId, refusalReason);
            if (response.data.success) {
                Alert.alert('Success', 'Your refusal request has been sent to the dispatcher.');
                setRefusalModalVisible(false);
                navigation.goBack();
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to submit trip refusal.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Map Section */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    initialRegion={mapRegion}
                    showsUserLocation={true}
                >
                    {/* Pick Up Marker */}
                    {trip?.primaryJob?.pickup?.location && (
                        <Marker
                            coordinate={{
                                latitude: trip.primaryJob.pickup.location.coordinates[1],
                                longitude: trip.primaryJob.pickup.location.coordinates[0],
                            }}
                            title="Pickup Location"
                            pinColor="green"
                        />
                    )}

                    {/* Delivery Marker */}
                    {trip?.primaryJob?.delivery?.location && (
                        <Marker
                            coordinate={{
                                latitude: trip.primaryJob.delivery.location.coordinates[1],
                                longitude: trip.primaryJob.delivery.location.coordinates[0],
                            }}
                            title="Delivery Location"
                            pinColor="red"
                        />
                    )}

                    {/* Route Polyline - The route format might need mapping based on how ORS stores it */}
                    {trip?.route?.coordinates && trip.route.coordinates.length > 0 && (
                        <Polyline
                            coordinates={trip.route.coordinates.map(coord => ({
                                latitude: coord[1],
                                longitude: coord[0]
                            }))}
                            strokeColor="#3B82F6"
                            strokeWidth={4}
                        />
                    )}
                </MapView>
            </View>

            {/* Controls Section */}
            <View style={styles.controlsContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.tripHeader}>Trip Management</Text>
                        <Text style={styles.tripId}>Job ID: {jobDisplayId}</Text>
                    </View>
                    {customerNote ? (
                        <TouchableOpacity style={styles.noteBtn} onPress={() => setShowNoteModal(true)}>
                            <Ionicons name="chatbubble-ellipses" size={32} color="#10B981" />
                            <View style={styles.redDot} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {status === 'scheduled' ? (
                    <View style={{ marginTop: 8 }}>
                        {loading ? (
                            <View style={[styles.loadingSlide, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
                                <PageLoading size={24} color="#10B981" />
                            </View>
                        ) : (
                            <SwipeButton
                                ref={startSwipeRef}
                                onSwipeComplete={handleAcceptTrip}
                                title="Slide to start trip"
                                color="#10B981"
                                arrowColor="#10B981"
                            />
                        )}
                        <TouchableOpacity style={styles.refuseButton} onPress={() => setRefusalModalVisible(true)}>
                            <Text style={styles.refuseButtonText}>Refuse Trip</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.circularNavButton}
                            onPress={openNativeNavigation}
                        >
                            <Ionicons name="navigate" size={26} color="#FFFFFF" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>

                        <View style={{ flex: 1, marginLeft: 16 }}>
                            {loading ? (
                                <View style={styles.loadingSlide}>
                                    <PageLoading size={24} color="#F59E0B" />
                                </View>
                            ) : (
                                <SwipeButton
                                    ref={completeSwipeRef}
                                    onSwipeComplete={handleCompleteTrip}
                                    title="Slide to complete"
                                />
                            )}
                        </View>
                    </View>
                )}
            </View>

            {/* Refusal Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={refusalModalVisible}
                onRequestClose={() => setRefusalModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Refuse Trip</Text>
                        <Text style={styles.modalSubtitle}>Please provide a reason for refusing this trip request.</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter your reason here..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={4}
                            value={refusalReason}
                            onChangeText={setRefusalReason}
                        />

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setRefusalModalVisible(false)}
                            >
                                <Text style={styles.modalBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnSubmit]}
                                onPress={handleRefuseTrip}
                                disabled={loading}
                            >
                                {loading ? (
                                    <PageLoading size={24} color="#fff" />
                                ) : (
                                    <Text style={styles.modalBtnSubmitText}>Submit Request</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Start Odometer Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={startOdoModalVisible}
                onRequestClose={() => {
                    setStartOdoModalVisible(false);
                    startSwipeRef.current?.reset();
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Trip Start Readings</Text>
                        <Text style={styles.modalSubtitle}>Please enter the starting odometer of your vehicle.</Text>

                        <Text style={styles.inputLabel}>Current Odometer (km) *</Text>
                        <TextInput
                            style={styles.singleLineInput}
                            placeholder="e.g. 52400.5"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            value={startOdometer}
                            onChangeText={(val) => {
                                // Block invalid characters directly
                                const sanitized = val.replace(/[eE\+\-]/g, '');

                                // Prevent leading zero unless value starts as "0." or is exactly "0"
                                let formatted = sanitized;
                                if (formatted.length > 1 && formatted.startsWith('0') && formatted[1] !== '.') {
                                    formatted = formatted.replace(/^0+/, '');
                                }
                                if (formatted === '') {
                                    // if it was "0" and became empty due to replacement, keep it empty or 0 if preferred
                                }
                                setStartOdometer(formatted);
                            }}
                        />

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => {
                                    setStartOdoModalVisible(false);
                                    startSwipeRef.current?.reset();
                                }}
                            >
                                <Text style={styles.modalBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: Colors.brandOrange }]}
                                onPress={confirmStartTrip}
                                disabled={loading}
                            >
                                {loading ? (
                                    <PageLoading size={24} color="#fff" />
                                ) : (
                                    <Text style={styles.modalBtnSubmitText}>Start Trip</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Note Read Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={showNoteModal}
                onRequestClose={() => setShowNoteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Delivery Note</Text>
                        <Text style={styles.modalSubtitle}>Left by the customer for Job {trip?.primaryJob?.jobId}</Text>

                        <View style={{ backgroundColor: '#F3F4F6', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                            <Text style={{ fontSize: 16, color: '#1F2937', fontStyle: 'italic' }}>"{customerNote}"</Text>
                        </View>

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: Colors.brandOrange }]}
                                onPress={() => setShowNoteModal(false)}
                            >
                                <Text style={styles.modalBtnSubmitText}>Close Note</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    mapContainer: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    controlsContainer: {
        padding: 24,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 5,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        marginTop: -16, // Overlap the map slightly
    },
    tripHeader: {
        fontSize: 12,
        fontFamily: Fonts.bold,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    tripId: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginBottom: 20,
    },
    button: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    circularNavButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1A1D26',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    loadingSlide: {
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFBEB',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    buttonAccept: {
        backgroundColor: '#1A1D26', // sidebar-active (dark)
    },
    buttonText: {
        color: Colors.surface,
        fontSize: 15,
        fontFamily: Fonts.medium,
        letterSpacing: 0.2,
    },
    refuseButton: {
        marginTop: 16,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EF4444',
        borderRadius: 8,
    },
    refuseButtonText: {
        color: '#EF4444',
        fontFamily: Fonts.medium,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        marginBottom: 24,
        lineHeight: 20,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 16,
        fontSize: 15,
        color: Colors.textPrimary,
        fontFamily: Fonts.regular,
        backgroundColor: '#F9FAFB',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 24,
    },
    singleLineInput: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 16,
        fontSize: 15,
        color: Colors.textPrimary,
        fontFamily: Fonts.regular,
        backgroundColor: '#F9FAFB',
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: Fonts.medium,
        color: '#374151',
        marginBottom: 8,
    },
    modalActionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnCancel: {
        backgroundColor: '#F3F4F6',
    },
    modalBtnCancelText: {
        color: '#4B5563',
        fontFamily: Fonts.medium,
    },
    modalBtnSubmit: {
        backgroundColor: '#EF4444',
    },
    modalBtnSubmitText: {
        color: 'white',
        fontFamily: Fonts.medium,
    },
    noteBtn: {
        position: 'relative',
        padding: 4,
        marginBottom: 10
    },
    redDot: {
        position: 'absolute',
        top: 2,
        right: 0,
        backgroundColor: '#EF4444',
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFF'
    }
});
