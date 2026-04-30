import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import PageLoading from '../../../../components/PageLoading';
import ThemedPopup from '../../../../components/ThemedPopup';
import { vehicleAPI } from '../../../../services/api';
import { styles } from './vehicleManager.styles';
import VehicleFormModal from './VehicleFormModal';

const getStatusColor = (status) => {
    if (!status) return '#9CA3AF';
    const s = String(status).toLowerCase();
    if (s === 'out of service' || s === 'out-of-service' || s === 'offline') return '#DC2626';
    if (s === 'active') return '#10B981';
    if (s === 'in maintenance') return '#F59E0B';
    if (status === 'available') return '#10B981';
    if (status === 'in-transit') return '#3B82F6';
    if (status === 'maintenance') return '#F59E0B';
    return '#9CA3AF';
};

const isComplianceRisk = (vehicle, thresholdDays = 3) => {
    const now = new Date();
    const toDays = (d) => {
        if (!d) return null;
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return null;
        return Math.ceil((dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };
    const lic = toDays(vehicle?.licenseEndDate);
    const ins = toDays(vehicle?.insuranceEndDate);
    const licRisk = typeof lic === 'number' && lic <= thresholdDays;
    const insRisk = typeof ins === 'number' && ins <= thresholdDays;
    return licRisk || insRisk;
};

export default function VehicleManagerScreen({ navigation }) {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '', buttons: [] });

    const showPopup = (title, message, buttons = null) => {
        setPopup({
            visible: true,
            title,
            message,
            buttons: buttons || [{ label: 'OK', variant: 'primary', onPress: () => setPopup((p) => ({ ...p, visible: false })) }],
        });
    };

    const loadVehicles = useCallback(async () => {
        try {
            setLoading(true);
            const response = await vehicleAPI.getAll();
            setVehicles(response.data?.vehicles || []);
        } catch (err) {
            showPopup('Error', err.response?.data?.error || 'Failed to load vehicles.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadVehicles();
        }, [loadVehicles])
    );

    const filteredVehicles = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return vehicles;
        return vehicles.filter(
            (v) =>
                v.registrationNumber?.toLowerCase().includes(term) ||
                v.model?.toLowerCase().includes(term) ||
                v.vehicleType?.toLowerCase().includes(term)
        );
    }, [vehicles, search]);

    const handleDelete = async (vehicleId) => {
        showPopup('Delete Vehicle', 'Are you sure you want to delete this vehicle?', [
            { label: 'Cancel', variant: 'neutral', onPress: () => setPopup((p) => ({ ...p, visible: false })) },
            {
                label: 'Delete',
                variant: 'danger',
                onPress: async () => {
                    setPopup((p) => ({ ...p, visible: false }));
                    try {
                        await vehicleAPI.delete(vehicleId);
                        loadVehicles();
                    } catch (err) {
                        showPopup('Error', err.response?.data?.error || 'Failed to delete vehicle.');
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
                        <Text style={styles.title}>Vehicles</Text>
                        <Text style={styles.subtitle}>Mirror fleet management from frontend</Text>
                    </View>
                    <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddVehicleScreen')}>
                        <Text style={styles.addButtonText}>Add Vehicle</Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search by registration/model/type"
                />

                <FlatList
                    data={filteredVehicles}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="car-outline" size={34} color="#9CA3AF" />
                            <Text style={styles.emptyText}>No vehicles found.</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View
                            style={[
                                styles.card,
                                (String(item.status || '').toLowerCase() === 'out of service' || isComplianceRisk(item)) && {
                                    borderColor: '#FCA5A5',
                                    backgroundColor: '#FEF2F2',
                                },
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.regNo}>{item.registrationNumber}</Text>
                                <View style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}>
                                    <Text style={styles.statusText}>{item.status || 'unknown'}</Text>
                                </View>
                            </View>
                            <Text style={styles.line}>{`${item.model || 'N/A'} • ${item.vehicleType || 'N/A'}`}</Text>
                            <Text style={styles.line}>
                                Capacity: {item.capacity?.weight || 0}kg / {item.capacity?.volume || 0}m3
                            </Text>
                            <Text style={styles.line}>Fuel: {item.fuelConsumption || 0} km/l</Text>
                            <Text style={styles.line}>
                                License expiry: {item.licenseEndDate ? new Date(item.licenseEndDate).toLocaleDateString() : 'N/A'}
                            </Text>
                            <Text style={styles.line}>
                                Insurance expiry: {item.insuranceEndDate ? new Date(item.insuranceEndDate).toLocaleDateString() : 'N/A'}
                            </Text>
                            <View style={styles.actions}>
                                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => setEditingVehicle(item)}>
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

            <VehicleFormModal
                visible={Boolean(editingVehicle)}
                editingVehicle={editingVehicle}
                onClose={() => setEditingVehicle(null)}
                onSaved={loadVehicles}
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
