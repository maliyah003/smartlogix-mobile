import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { vehicleAPI } from '../../../../services/api';
import { styles } from './vehicleManager.styles';

const initialData = {
    registrationNumber: '',
    vehicleType: 'Truck',
    status: 'available',
    model: '',
    weightCapacity: '',
    volumeCapacity: '',
    fuelConsumption: '',
    licenseEndDate: null,
    insuranceEndDate: null,
};
const VEHICLE_TYPE_OPTIONS = [
    { value: 'Truck', label: 'Truck' },
    { value: 'Van', label: 'Van' },
];
const STATUS_OPTIONS = [
    { value: 'available', label: 'Available' },
    { value: 'in-transit', label: 'In Transit' },
    { value: 'maintenance', label: 'Maintenance' },
];

export default function VehicleFormModal({ visible, onClose, onSaved, editingVehicle }) {
    const [form, setForm] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [showLicensePicker, setShowLicensePicker] = useState(false);
    const [showInsurancePicker, setShowInsurancePicker] = useState(false);
    const [licenseDraft, setLicenseDraft] = useState(new Date());
    const [insuranceDraft, setInsuranceDraft] = useState(new Date());
    const [activeSelect, setActiveSelect] = useState(null);

    useEffect(() => {
        if (editingVehicle) {
            setForm({
                registrationNumber: editingVehicle.registrationNumber || '',
                vehicleType: editingVehicle.vehicleType || 'Truck',
                status: editingVehicle.status || 'available',
                model: editingVehicle.model || '',
                weightCapacity: String(editingVehicle.capacity?.weight || ''),
                volumeCapacity: String(editingVehicle.capacity?.volume || ''),
                fuelConsumption: String(editingVehicle.fuelConsumption || ''),
                licenseEndDate: editingVehicle.licenseEndDate ? new Date(editingVehicle.licenseEndDate) : null,
                insuranceEndDate: editingVehicle.insuranceEndDate ? new Date(editingVehicle.insuranceEndDate) : null,
            });
            return;
        }
        setForm(initialData);
    }, [editingVehicle, visible]);

    const openLicensePicker = () => {
        const date = form.licenseEndDate ? new Date(form.licenseEndDate) : new Date();
        setLicenseDraft(Number.isNaN(date.getTime()) ? new Date() : date);
        setShowLicensePicker(true);
    };

    const openInsurancePicker = () => {
        const date = form.insuranceEndDate ? new Date(form.insuranceEndDate) : new Date();
        setInsuranceDraft(Number.isNaN(date.getTime()) ? new Date() : date);
        setShowInsurancePicker(true);
    };

    const getOptionLabel = (options, value) => options.find((o) => o.value === value)?.label || 'Select';

    const validate = () => {
        if (!form.registrationNumber.trim()) return 'Registration number is required.';
        if (!form.model.trim()) return 'Model is required.';
        if (!form.weightCapacity || Number(form.weightCapacity) <= 0) return 'Weight capacity should be positive.';
        if (!form.volumeCapacity || Number(form.volumeCapacity) <= 0) return 'Volume capacity should be positive.';
        if (!form.licenseEndDate) return 'License expiry date is required.';
        if (!form.insuranceEndDate) return 'Insurance expiry date is required.';
        return null;
    };

    const buildPayload = () => ({
        registrationNumber: form.registrationNumber.trim(),
        vehicleType: form.vehicleType.trim(),
        status: form.status.trim(),
        model: form.model.trim(),
        capacity: {
            weight: Number(form.weightCapacity),
            volume: Number(form.volumeCapacity),
        },
        fuelConsumption: Number(form.fuelConsumption || 0),
        licenseEndDate: form.licenseEndDate ? new Date(form.licenseEndDate).toISOString() : null,
        insuranceEndDate: form.insuranceEndDate ? new Date(form.insuranceEndDate).toISOString() : null,
    });

    const handleSubmit = async () => {
        const error = validate();
        if (error) {
            Alert.alert('Validation', error);
            return;
        }
        setLoading(true);
        try {
            const payload = buildPayload();
            if (editingVehicle?._id) {
                await vehicleAPI.update(editingVehicle._id, payload);
            } else {
                await vehicleAPI.create(payload);
            }
            onSaved?.();
            onClose?.();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to save vehicle.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formOverlay}>
                <View style={styles.formCard}>
                    <ScrollView contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <Text style={styles.formTitle}>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</Text>

                        <Text style={styles.formLabel}>Registration Number *</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="car-outline" size={18} color="#9CA3AF" />
                            <TextInput style={styles.formFieldWithIcon} placeholder="WP-1234" value={form.registrationNumber} onChangeText={(registrationNumber) => setForm((p) => ({ ...p, registrationNumber }))} />
                        </View>

                        <Text style={styles.formLabel}>Model *</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="construct-outline" size={18} color="#9CA3AF" />
                            <TextInput style={styles.formFieldWithIcon} placeholder="e.g. Isuzu ELF" value={form.model} onChangeText={(model) => setForm((p) => ({ ...p, model }))} />
                        </View>

                        <Text style={styles.formLabel}>Weight Capacity (kg) *</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="barbell-outline" size={18} color="#9CA3AF" />
                            <TextInput style={styles.formFieldWithIcon} placeholder="e.g. 3500" value={form.weightCapacity} onChangeText={(weightCapacity) => setForm((p) => ({ ...p, weightCapacity }))} keyboardType="numeric" />
                        </View>

                        <Text style={styles.formLabel}>Volume Capacity (m3) *</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
                            <TextInput style={styles.formFieldWithIcon} placeholder="e.g. 16" value={form.volumeCapacity} onChangeText={(volumeCapacity) => setForm((p) => ({ ...p, volumeCapacity }))} keyboardType="numeric" />
                        </View>

                        <Text style={styles.formLabel}>Fuel Consumption (km/l)</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="water-outline" size={18} color="#9CA3AF" />
                            <TextInput style={styles.formFieldWithIcon} placeholder="e.g. 8.5" value={form.fuelConsumption} onChangeText={(fuelConsumption) => setForm((p) => ({ ...p, fuelConsumption }))} keyboardType="numeric" />
                        </View>

                        <Text style={styles.formLabel}>Vehicle Type</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('vehicleType')}>
                            <Text style={styles.selectFieldText}>{getOptionLabel(VEHICLE_TYPE_OPTIONS, form.vehicleType)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#374151" />
                        </TouchableOpacity>

                        <Text style={styles.formLabel}>Status</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('status')}>
                            <Text style={styles.selectFieldText}>{getOptionLabel(STATUS_OPTIONS, form.status)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#374151" />
                        </TouchableOpacity>

                        <Text style={styles.formLabel}>License Expiry Date *</Text>
                        <TouchableOpacity style={styles.selectField} onPress={openLicensePicker}>
                            <Text style={styles.selectFieldText}>
                                {form.licenseEndDate ? new Date(form.licenseEndDate).toLocaleDateString() : 'Select date'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#374151" />
                        </TouchableOpacity>

                        <Text style={styles.formLabel}>Insurance Expiry Date *</Text>
                        <TouchableOpacity style={styles.selectField} onPress={openInsurancePicker}>
                            <Text style={styles.selectFieldText}>
                                {form.insuranceEndDate ? new Date(form.insuranceEndDate).toLocaleDateString() : 'Select date'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#374151" />
                        </TouchableOpacity>

                        <View style={styles.formActions}>
                            <TouchableOpacity style={[styles.formBtn, styles.formCancel]} onPress={onClose} disabled={loading}>
                                <Text style={styles.formCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.formBtn, styles.formSubmit]} onPress={handleSubmit} disabled={loading}>
                                <Text style={styles.formSubmitText}>{loading ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <Modal visible={Boolean(activeSelect)} transparent animationType="fade" onRequestClose={() => setActiveSelect(null)}>
                <View style={styles.sheetOverlay}>
                    <View style={styles.sheetCard}>
                        <Text style={styles.sheetTitle}>Select Option</Text>
                        <ScrollView style={styles.sheetOptions}>
                            {(activeSelect === 'vehicleType' ? VEHICLE_TYPE_OPTIONS : STATUS_OPTIONS).map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={styles.sheetOption}
                                    onPress={() => {
                                        if (activeSelect === 'vehicleType') {
                                            setForm((p) => ({ ...p, vehicleType: opt.value }));
                                        } else {
                                            setForm((p) => ({ ...p, status: opt.value }));
                                        }
                                        setActiveSelect(null);
                                    }}
                                >
                                    <Text style={styles.sheetOptionText}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.formBtn, styles.formCancel, { alignSelf: 'flex-end', marginTop: 8 }]} onPress={() => setActiveSelect(null)}>
                            <Text style={styles.formCancelText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showLicensePicker} transparent animationType="fade" onRequestClose={() => setShowLicensePicker(false)}>
                <View style={styles.sheetOverlay}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.sheetTitle}>Select License Expiry</Text>
                        <DateTimePicker
                            value={licenseDraft}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                if (Platform.OS === 'android') {
                                    setShowLicensePicker(false);
                                    if (event.type === 'set' && date) setForm((p) => ({ ...p, licenseEndDate: date }));
                                    return;
                                }
                                if (date) setLicenseDraft(date);
                            }}
                        />
                        {Platform.OS === 'ios' ? (
                            <View style={styles.formActions}>
                                <TouchableOpacity style={[styles.formBtn, styles.formCancel]} onPress={() => setShowLicensePicker(false)}>
                                    <Text style={styles.formCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.formBtn, styles.formSubmit]}
                                    onPress={() => {
                                        setForm((p) => ({ ...p, licenseEndDate: licenseDraft }));
                                        setShowLicensePicker(false);
                                    }}
                                >
                                    <Text style={styles.formSubmitText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </View>
                </View>
            </Modal>

            <Modal visible={showInsurancePicker} transparent animationType="fade" onRequestClose={() => setShowInsurancePicker(false)}>
                <View style={styles.sheetOverlay}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.sheetTitle}>Select Insurance Expiry</Text>
                        <DateTimePicker
                            value={insuranceDraft}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                if (Platform.OS === 'android') {
                                    setShowInsurancePicker(false);
                                    if (event.type === 'set' && date) setForm((p) => ({ ...p, insuranceEndDate: date }));
                                    return;
                                }
                                if (date) setInsuranceDraft(date);
                            }}
                        />
                        {Platform.OS === 'ios' ? (
                            <View style={styles.formActions}>
                                <TouchableOpacity style={[styles.formBtn, styles.formCancel]} onPress={() => setShowInsurancePicker(false)}>
                                    <Text style={styles.formCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.formBtn, styles.formSubmit]}
                                    onPress={() => {
                                        setForm((p) => ({ ...p, insuranceEndDate: insuranceDraft }));
                                        setShowInsurancePicker(false);
                                    }}
                                >
                                    <Text style={styles.formSubmitText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}
