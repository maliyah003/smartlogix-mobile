import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import { driverAPI, tripAPI } from '../../../../services/api';
import { Colors, Fonts } from '../../../../theme/ui';
import { styles } from './tripRefusals.styles';

export default function TripRefusalAssignScreen({ navigation, route }) {
    const trip = route.params?.trip;
    const refusedDriverId = trip?.driver?._id || trip?.driver;

    const [loading, setLoading] = useState(true);
    const [drivers, setDrivers] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const driversRes = await driverAPI.getAvailable();
                const list = (driversRes.data?.drivers || [])
                    .filter((d) => !d.isAdmin)
                    .filter((d) => String(d._id) !== String(refusedDriverId));
                setDrivers(list);
            } catch (e) {
                setDrivers([]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [refusedDriverId]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return drivers;
        return drivers.filter((d) => d.name?.toLowerCase().includes(term) || d.contactNumber?.toLowerCase().includes(term));
    }, [drivers, search]);

    const confirm = async () => {
        if (!trip?.tripId || !selectedDriverId) return;
        try {
            setSaving(true);
            await tripAPI.approveRefusal(trip.tripId, { newDriverId: selectedDriverId });
            Alert.alert('Success', 'Refusal accepted and trip reassigned.');
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to reassign trip.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={18} color={Colors.brandOrange} />
                    <Text style={{ fontFamily: Fonts.bold, color: Colors.brandOrange }}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Assign driver</Text>
                <Text style={styles.subtitle}>Job: {trip?.primaryJob?.jobId || trip?.jobId || trip?.tripId}</Text>

                <TextInput
                    style={styles.input}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search drivers"
                    placeholderTextColor={Colors.textTertiary}
                />

                <FlatList
                    data={filtered}
                    keyExtractor={(d) => d._id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="person-outline" size={36} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No available drivers.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.card, selectedDriverId === item._id && { borderColor: Colors.brandOrange, borderWidth: 1.5 }]}
                            onPress={() => setSelectedDriverId(item._id)}
                        >
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.line}>Phone: {item.contactNumber || '—'}</Text>
                            <Text style={styles.line}>Status: {item.status || '—'}</Text>
                        </TouchableOpacity>
                    )}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity style={styles.modalCancel} onPress={() => navigation.goBack()}>
                        <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modalConfirm, (saving || !selectedDriverId) && { opacity: 0.6 }]}
                        onPress={confirm}
                        disabled={saving || !selectedDriverId}
                    >
                        <Text style={styles.modalConfirmText}>{saving ? 'Saving...' : 'Confirm'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
}

