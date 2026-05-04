import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import { driverAPI } from '../../../../services/api';
import { styles } from './driverMonitor.styles';
import IncidentFormModal from './IncidentFormModal';

const toDateLabel = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString();
};

export default function DriverIncidentsScreen() {
    const [drivers, setDrivers] = useState([]);
    const [incidentsByDriver, setIncidentsByDriver] = useState({});
    const [scoresByDriver, setScoresByDriver] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDriver, setSelectedDriver] = useState(null);

    const loadIncidents = useCallback(async () => {
        try {
            setLoading(true);
            const response = await driverAPI.getAll();
            const list = (response.data?.drivers || []).filter((driver) => !driver.isAdmin);
            setDrivers(list);

            const scoreEntries = await Promise.all(
                list.map(async (d) => {
                    try {
                        const scoreRes = await driverAPI.getScore(d._id);
                        return [d._id, scoreRes.data?.score?.score ?? null];
                    } catch {
                        return [d._id, null];
                    }
                })
            );
            setScoresByDriver(Object.fromEntries(scoreEntries));

            const pairs = await Promise.all(
                list.map(async (d) => {
                    try {
                        const incidentsRes = await driverAPI.getIncidents(d._id, { limit: 5 });
                        return [d._id, incidentsRes.data?.incidents || []];
                    } catch {
                        return [d._id, []];
                    }
                })
            );
            setIncidentsByDriver(Object.fromEntries(pairs));
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to load incidents.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadIncidents();
    }, [loadIncidents]);

    const filteredDrivers = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return drivers;
        return drivers.filter(
            (d) =>
                d.name?.toLowerCase().includes(term) ||
                d.licenseNumber?.toLowerCase().includes(term)
        );
    }, [drivers, search]);

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Incidents</Text>
                        <Text style={styles.subtitle}>Add incidents from this tab only</Text>
                    </View>
                </View>

                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search driver for incidents"
                />

                <FlatList
                    data={filteredDrivers}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="warning-outline" size={34} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No drivers found.</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const incidents = incidentsByDriver[item._id] || [];
                        return (
                            <View style={styles.card}>
                                <View style={styles.cardHeaderTop}>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <TouchableOpacity
                                        style={styles.incidentActionButton}
                                        onPress={() => setSelectedDriver(item)}
                                    >
                                        <Ionicons name="add-circle-outline" size={14} color="#f49522" />
                                        <Text style={styles.incidentActionButtonText}>Add Incident</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.line}>License: {item.licenseNumber || 'N/A'}</Text>
                                <Text style={styles.line}>
                                    Score: {scoresByDriver[item._id] == null ? 'N/A' : `${scoresByDriver[item._id]}/100`}
                                </Text>
                                <Text style={[styles.line, { marginTop: 10, marginBottom: 4 }]}>Recent incidents:</Text>
                                {incidents.length === 0 ? (
                                    <Text style={styles.line}>No incidents recorded.</Text>
                                ) : (
                                    incidents.map((inc) => (
                                        <Text key={inc._id} style={styles.line}>
                                            {`${inc.category} • ${inc.severity} • ${toDateLabel(inc.occurredAt)}`}
                                        </Text>
                                    ))
                                )}
                            </View>
                        );
                    }}
                />
            </View>

            <IncidentFormModal
                visible={Boolean(selectedDriver)}
                driver={selectedDriver}
                onClose={() => setSelectedDriver(null)}
                onSaved={loadIncidents}
            />
        </ScreenWrapper>
    );
}
