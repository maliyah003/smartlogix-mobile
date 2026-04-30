import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import PageLoading from '../components/PageLoading';
import { customerPortalAPI } from '../services/api';
import { Colors, Fonts, Shadows } from '../theme/ui';

const fmt = (value, fallback = '—') => (value == null || value === '' ? fallback : String(value));

function shouldShowLiveMap(job) {
    const tripStatus = job?.assignedTrip?.status;
    return tripStatus === 'active' || tripStatus === 'completed';
}

function TrackingTimeline({ job }) {
    const tripStatus = job?.assignedTrip?.status;
    const jobStatus = job?.status;
    const status = tripStatus || jobStatus || 'pending';

    const steps = [
        { key: 'pending', label: 'Booked' },
        { key: 'matched', label: 'Matched' },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'active', label: 'On route' },
        { key: 'completed', label: 'Delivered' },
    ];

    const activeIndex = (() => {
        if (status === 'completed') return 4;
        if (status === 'active' || jobStatus === 'in-transit') return 3;
        if (status === 'scheduled' || status === 'assigned') return 2;
        if (status === 'matched') return 1;
        return 0;
    })();

    return (
        <View style={timelineStyles.card}>
            <Text style={timelineStyles.title}>Progress</Text>
            <View style={timelineStyles.row}>
                {steps.map((s, idx) => {
                    const done = idx <= activeIndex;
                    return (
                        <React.Fragment key={s.key}>
                            <View style={timelineStyles.step}>
                                <View style={[timelineStyles.dot, done && timelineStyles.dotDone]}>
                                    {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                                </View>
                                <Text style={[timelineStyles.label, done && timelineStyles.labelDone]} numberOfLines={1}>
                                    {s.label}
                                </Text>
                            </View>
                            {idx < steps.length - 1 ? (
                                <View style={[timelineStyles.line, idx < activeIndex && timelineStyles.lineDone]} />
                            ) : null}
                        </React.Fragment>
                    );
                })}
            </View>
        </View>
    );
}

const timelineStyles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        marginBottom: 12,
        ...Shadows.card,
    },
    title: { fontFamily: Fonts.bold, color: Colors.textPrimary, fontSize: 16, marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center' },
    step: { width: 62, alignItems: 'center' },
    dot: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    dotDone: { backgroundColor: Colors.brandOrange },
    label: { fontSize: 10, fontFamily: Fonts.medium, color: Colors.textTertiary, textAlign: 'center' },
    labelDone: { color: Colors.textPrimary },
    line: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 18 },
    lineDone: { backgroundColor: Colors.brandOrange },
});

export default function TrackingDetailsScreen({ navigation, route }) {
    const jobId = route.params?.jobId;
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState(null);
    const [error, setError] = useState('');

    const [livePosition, setLivePosition] = useState(null);
    const [note, setNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const liveTimer = useRef(null);

    const fetchJob = async () => {
        try {
            setError('');
            const response = await customerPortalAPI.trackShipment(jobId);
            if (response.data?.success) {
                setJob(response.data.job);
                setNote(response.data.job?.specialInstructions || '');
                if (response.data.job?.assignedTrip?.currentPosition?.coordinates?.length === 2) {
                    setLivePosition({
                        longitude: response.data.job.assignedTrip.currentPosition.coordinates[0],
                        latitude: response.data.job.assignedTrip.currentPosition.coordinates[1],
                    });
                }
            } else {
                setError(response.data?.error || 'Shipment not found.');
            }
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to load tracking details.');
        }
    };

    const handleSaveNote = async () => {
        if (!jobId) return;
        try {
            setSavingNote(true);
            await customerPortalAPI.updateDeliveryNote(jobId, note);
            setJob((prev) => (prev ? { ...prev, specialInstructions: note } : prev));
            Alert.alert('Success', 'Delivery note saved successfully.');
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to save delivery note.');
        } finally {
            setSavingNote(false);
        }
    };

    const handleDeleteNote = () => {
        Alert.alert(
            'Remove delivery note?',
            `The driver will no longer see these delivery instructions for ${jobId}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSavingNote(true);
                            await customerPortalAPI.updateDeliveryNote(jobId, '');
                            setNote('');
                            setJob((prev) => (prev ? { ...prev, specialInstructions: '' } : prev));
                            Alert.alert('Success', 'Delivery note removed.');
                        } catch (e) {
                            Alert.alert('Error', e.response?.data?.error || 'Failed to remove delivery note.');
                        } finally {
                            setSavingNote(false);
                        }
                    },
                },
            ]
        );
    };

    useEffect(() => {
        let cancelled = false;
        const boot = async () => {
            if (!jobId) {
                setError('Missing Job ID.');
                setLoading(false);
                return;
            }
            setLoading(true);
            await fetchJob();
            if (!cancelled) setLoading(false);
        };
        boot();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId]);

    const tripId = job?.assignedTrip?.jobId || job?.assignedTrip?.tripId || null;
    const tripStatus = job?.assignedTrip?.status;

    const routeCoords = useMemo(() => {
        const coords = job?.assignedTrip?.route?.coordinates || [];
        return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    }, [job]);

    const pickupCoord = useMemo(() => {
        const c = job?.pickup?.location?.coordinates;
        if (!c || c.length !== 2) return null;
        return { longitude: c[0], latitude: c[1] };
    }, [job]);

    const deliveryCoord = useMemo(() => {
        const c = job?.delivery?.location?.coordinates;
        if (!c || c.length !== 2) return null;
        return { longitude: c[0], latitude: c[1] };
    }, [job]);

    const initialRegion = useMemo(() => {
        const base = pickupCoord || deliveryCoord || routeCoords[0];
        if (!base) {
            return { latitude: 6.9271, longitude: 79.8612, latitudeDelta: 2.8, longitudeDelta: 2.8 };
        }
        return { latitude: base.latitude, longitude: base.longitude, latitudeDelta: 0.7, longitudeDelta: 0.7 };
    }, [pickupCoord, deliveryCoord, routeCoords]);

    useEffect(() => {
        if (!tripId) return undefined;
        if (liveTimer.current) clearInterval(liveTimer.current);

        // While scheduled: keep refetching so map appears once active
        if (jobId && tripStatus === 'scheduled') {
            liveTimer.current = setInterval(fetchJob, 6000);
            return () => clearInterval(liveTimer.current);
        }

        // Only show live driver marker when active
        if (tripStatus !== 'active') return undefined;

        const firebaseBase = 'https://smartlogix-bb740-default-rtdb.asia-southeast1.firebasedatabase.app';
        const url = `${firebaseBase}/trips/${tripId}/currentPosition.json`;

        const tick = async () => {
            try {
                const res = await fetch(url);
                const data = await res.json();
                const coords = data?.coordinates;
                if (Array.isArray(coords) && coords.length === 2) {
                    setLivePosition({ longitude: coords[0], latitude: coords[1] });
                }
            } catch {
                // ignore
            }
        };

        tick();
        liveTimer.current = setInterval(tick, 5000);
        return () => clearInterval(liveTimer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripId, tripStatus, jobId]);

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <ScrollView contentContainerStyle={styles.page}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={18} color={Colors.brandOrange} />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Shipment details</Text>
                <Text style={styles.subtitle}>Tracking ID: {fmt(jobId)}</Text>

                {error ? (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {job ? (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Summary</Text>
                            <Text style={styles.line}>Status: {fmt(job.assignedTrip?.status || job.status)}</Text>
                            <Text style={styles.line}>Job ID: {fmt(job.jobId)}</Text>
                            <Text style={styles.line}>Vehicle: {fmt(job.assignedVehicle?.registrationNumber)}</Text>
                            <Text style={styles.line}>Driver: {fmt(job.assignedTrip?.driver?.name)}</Text>
                            <Text style={styles.line} numberOfLines={2}>Pickup: {fmt(job.pickup?.address)}</Text>
                            <Text style={styles.line} numberOfLines={2}>Delivery: {fmt(job.delivery?.address)}</Text>
                        </View>

                        <TrackingTimeline job={job} />

                        {shouldShowLiveMap(job) ? (
                            <View style={styles.mapWrap}>
                                <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
                                    <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />

                                    {pickupCoord ? <Marker coordinate={pickupCoord} title="Pickup" /> : null}
                                    {deliveryCoord ? <Marker coordinate={deliveryCoord} title="Delivery" pinColor="green" /> : null}
                                    {routeCoords.length ? <Polyline coordinates={routeCoords} strokeColor="#2563EB" strokeWidth={4} /> : null}

                                    {tripStatus === 'active' && livePosition ? (
                                        <Marker
                                            coordinate={livePosition}
                                            title="Driver location (Live)"
                                            description="Visible only while trip is active"
                                            pinColor="red"
                                        />
                                    ) : null}
                                </MapView>
                            </View>
                        ) : (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Live map</Text>
                                <Text style={styles.line}>
                                    {tripStatus === 'scheduled'
                                        ? 'Your driver hasn’t started this trip yet. Live map will appear once the trip becomes active.'
                                        : !tripId
                                            ? 'A trip hasn’t been assigned to this job yet.'
                                            : 'Live map is not available for this shipment state.'}
                                </Text>
                            </View>
                        )}

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Delivery Instructions</Text>
                            <TextInput
                                style={styles.noteInput}
                                value={note}
                                onChangeText={setNote}
                                placeholder="e.g. Leave at the security gate or call on arrival..."
                                placeholderTextColor={Colors.textTertiary}
                                multiline
                            />
                            <View style={styles.noteActions}>
                                <TouchableOpacity
                                    style={[styles.noteButton, styles.noteSaveButton, savingNote && styles.noteButtonDisabled]}
                                    onPress={handleSaveNote}
                                    disabled={savingNote}
                                >
                                    <Text style={styles.noteSaveText}>{savingNote ? 'Updating...' : 'Save note'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.noteButton, styles.noteDeleteButton, savingNote && styles.noteButtonDisabled]}
                                    onPress={handleDeleteNote}
                                    disabled={savingNote || !String(note || job?.specialInstructions || '').trim()}
                                >
                                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                                    <Text style={styles.noteDeleteText}>Remove note</Text>
                                </TouchableOpacity>
                            </View>
                            {job?.specialInstructions !== note ? (
                                <Text style={styles.unsavedText}>Unsaved changes detected.</Text>
                            ) : null}
                        </View>
                    </>
                ) : (
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={async () => {
                            setLoading(true);
                            await fetchJob();
                            setLoading(false);
                            if (!job) Alert.alert('Not found', 'Shipment not found for this Job ID.');
                        }}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    page: { padding: 16, paddingBottom: 30 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    backText: { fontFamily: Fonts.bold, color: Colors.brandOrange, fontSize: 14 },
    title: { fontFamily: Fonts.bold, fontSize: 24, color: Colors.textPrimary },
    subtitle: { fontFamily: Fonts.medium, fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 12 },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: 14,
        marginBottom: 12,
        ...Shadows.card,
    },
    cardTitle: { fontFamily: Fonts.bold, color: Colors.textPrimary, fontSize: 16, marginBottom: 8 },
    line: { fontFamily: Fonts.medium, color: Colors.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 19 },
    mapWrap: { height: 280, borderRadius: 14, overflow: 'hidden', marginBottom: 12, ...Shadows.card },
    noteInput: {
        minHeight: 92,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: '#F8F9FB',
        color: Colors.textPrimary,
        fontFamily: Fonts.medium,
        fontSize: 14,
        textAlignVertical: 'top',
    },
    noteActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    noteButton: {
        flex: 1,
        minHeight: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    noteSaveButton: {
        backgroundColor: Colors.brandOrange,
    },
    noteDeleteButton: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    noteButtonDisabled: {
        opacity: 0.6,
    },
    noteSaveText: {
        color: '#fff',
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    noteDeleteText: {
        color: Colors.danger,
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    unsavedText: {
        marginTop: 10,
        color: Colors.brandOrange,
        fontFamily: Fonts.semibold,
        fontSize: 12,
    },
    errorBox: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    errorText: { flex: 1, fontFamily: Fonts.medium, color: Colors.danger, fontSize: 13 },
    retryBtn: { backgroundColor: Colors.brandOrange, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    retryText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 15 },
});

