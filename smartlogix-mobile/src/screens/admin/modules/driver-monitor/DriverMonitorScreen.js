import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import ThemedPopup from '../../../../components/ThemedPopup';
import { driverAPI } from '../../../../services/api';
import { styles } from './driverMonitor.styles';
import DriverFormModal from './DriverFormModal';

const STATUS_FILTERS = ['all', 'available', 'on-trip', 'off-duty'];

const getStatusColor = (status) => {
    if (status === 'available') return '#10B981';
    if (status === 'on-trip') return '#3B82F6';
    return '#9CA3AF';
};

export default function DriverMonitorScreen({ navigation }) {
    const [drivers, setDrivers] = useState([]);
    const [scoresByDriver, setScoresByDriver] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editingDriver, setEditingDriver] = useState(null);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '', buttons: [] });

    const showPopup = (title, message, buttons = null) => {
        setPopup({
            visible: true,
            title,
            message,
            buttons: buttons || [{ label: 'OK', variant: 'primary', onPress: () => setPopup((p) => ({ ...p, visible: false })) }],
        });
    };

    const loadDrivers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await driverAPI.getAll();
            const list = (response.data?.drivers || []).filter((driver) => !driver.isAdmin);
            setDrivers(list);

            const scoreEntries = await Promise.all(
                list.map(async (driver) => {
                    try {
                        const scoreRes = await driverAPI.getScore(driver._id);
                        const scoreValue = scoreRes.data?.score?.score ?? null;
                        return [driver._id, scoreValue];
                    } catch {
                        return [driver._id, null];
                    }
                })
            );
            setScoresByDriver(Object.fromEntries(scoreEntries));
        } catch (err) {
            showPopup('Error', err.response?.data?.error || 'Failed to load drivers.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDrivers();
        }, [loadDrivers])
    );

    const filteredDrivers = useMemo(
        () =>
            drivers.filter((d) => {
                const byStatus = statusFilter === 'all' || d.status === statusFilter;
                const term = search.trim().toLowerCase();
                if (!term) return byStatus;
                return (
                    byStatus &&
                    (d.name?.toLowerCase().includes(term) ||
                        d.licenseNumber?.toLowerCase().includes(term) ||
                        d.contactNumber?.toLowerCase().includes(term))
                );
            }),
        [drivers, search, statusFilter]
    );

    const handleDelete = async (driverId) => {
        showPopup('Delete Driver', 'Are you sure you want to delete this driver?', [
            { label: 'Cancel', variant: 'neutral', onPress: () => setPopup((p) => ({ ...p, visible: false })) },
            {
                label: 'Delete',
                variant: 'danger',
                onPress: async () => {
                    setPopup((p) => ({ ...p, visible: false }));
                    try {
                        await driverAPI.delete(driverId);
                        loadDrivers();
                    } catch (err) {
                        showPopup('Error', err.response?.data?.error || 'Failed to delete driver.');
                    }
                },
            },
        ]);
    };

    if (loading) return <PageLoading fullScreen />;

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Drivers</Text>
                        <Text style={styles.subtitle}>Monitor and maintain driver records</Text>
                    </View>
                    <TouchableOpacity style={[styles.btn, styles.btnPrimary, styles.headerBtn]} onPress={() => navigation.navigate('AddDriverScreen')}>
                        <Text style={styles.btnTextPrimary}>Add Driver</Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by name, license, phone"
                />

                <View style={styles.filterRow}>
                    {STATUS_FILTERS.map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                            onPress={() => setStatusFilter(status)}
                        >
                            <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                                {status}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <FlatList
                    data={filteredDrivers}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={34} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No drivers found.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.name}>{item.name}</Text>
                                <View style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}>
                                    <Text style={styles.statusText}>{item.status || 'unknown'}</Text>
                                </View>
                            </View>
                            <Text style={styles.line}>License: {item.licenseNumber || 'N/A'}</Text>
                            <Text style={styles.line}>Contact: {item.contactNumber || 'N/A'}</Text>
                            <Text style={styles.line}>Email: {item.email || 'N/A'}</Text>
                            <Text style={styles.line}>
                                Score: {scoresByDriver[item._id] == null ? 'N/A' : `${scoresByDriver[item._id]}/100`}
                            </Text>
                            <View style={styles.row}>
                                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setEditingDriver(item)}>
                                    <Text style={styles.btnTextPrimary}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => handleDelete(item._id)}>
                                    <Text style={styles.btnTextDanger}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </View>

            <DriverFormModal
                visible={Boolean(editingDriver)}
                editingDriver={editingDriver}
                onClose={() => setEditingDriver(null)}
                onSaved={loadDrivers}
            />
            <ThemedPopup
                visible={popup.visible}
                title={popup.title}
                message={popup.message}
                buttons={popup.buttons}
                onRequestClose={() => setPopup((p) => ({ ...p, visible: false }))}
            />
        </ScreenWrapper>
    );
}
