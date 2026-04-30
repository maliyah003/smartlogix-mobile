import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import ThemedPopup from '../../../../components/ThemedPopup';
import { vehicleAPI } from '../../../../services/api';
import { styles } from './vehicleManager.styles';

const STEPS = [
    { id: 1, title: 'Basic' },
    { id: 2, title: 'Capacity' },
    { id: 3, title: 'Status' },
];

const VEHICLE_TYPE_OPTIONS = [
    { value: 'Truck', label: 'Truck' },
    { value: 'Van', label: 'Van' },
];

const STATUS_OPTIONS = [
    { value: 'available', label: 'Available' },
    { value: 'in-transit', label: 'In Transit' },
    { value: 'maintenance', label: 'Maintenance' },
];

const initialForm = {
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

const getOptionLabel = (options, value) => options.find((o) => o.value === value)?.label || 'Select';

export default function AddVehicleScreen({ navigation }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [activeSelect, setActiveSelect] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [showLicensePicker, setShowLicensePicker] = useState(false);
    const [showInsurancePicker, setShowInsurancePicker] = useState(false);
    const [licenseDraft, setLicenseDraft] = useState(new Date());
    const [insuranceDraft, setInsuranceDraft] = useState(new Date());
    const [popup, setPopup] = useState({ visible: false, title: '', message: '', buttons: [] });

    const showPopup = (title, message, buttons = null) => {
        setPopup({
            visible: true,
            title,
            message,
            buttons: buttons || [{ label: 'OK', variant: 'primary', onPress: () => setPopup((p) => ({ ...p, visible: false })) }],
        });
    };

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

    const stepError = useMemo(() => {
        if (currentStep === 1) {
            if (!form.registrationNumber.trim()) return 'Registration number is required.';
            if (!form.model.trim()) return 'Model is required.';
            if (!form.licenseEndDate) return 'License expiry date is required.';
            if (!form.insuranceEndDate) return 'Insurance expiry date is required.';
        }
        if (currentStep === 2) {
            if (!form.weightCapacity || Number(form.weightCapacity) <= 0) return 'Weight capacity should be positive.';
            if (!form.volumeCapacity || Number(form.volumeCapacity) <= 0) return 'Volume capacity should be positive.';
        }
        return null;
    }, [currentStep, form]);

    const canMoveNext = !stepError;

    const goNext = () => {
        if (stepError) {
            showPopup('Validation', stepError);
            return;
        }
        setCurrentStep((prev) => Math.min(prev + 1, 3));
    };

    const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const handleCreate = async () => {
        if (stepError) {
            showPopup('Validation', stepError);
            return;
        }
        setLoading(true);
        try {
            await vehicleAPI.create({
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
                currentLocation: { coordinates: [79.8612, 6.9271] },
            });
            showPopup('Vehicle Created', 'Vehicle has been added successfully.', [
                {
                    label: 'OK',
                    variant: 'primary',
                    onPress: () => {
                        setPopup((p) => ({ ...p, visible: false }));
                        navigation.navigate('VehicleManagerHome', { refreshAt: Date.now() });
                    },
                },
            ]);
        } catch (err) {
            showPopup('Error', err.response?.data?.error || 'Failed to create vehicle.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                keyboardVerticalOffset={40}
            >
                <ScrollView
                    contentContainerStyle={styles.formScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerRow}>
                        <View>
                            <TouchableOpacity
                                style={[styles.addActionButton, { alignSelf: 'flex-start', marginBottom: 10 }]}
                                onPress={() => navigation.navigate('VehicleManagerHome')}
                            >
                                <Ionicons name="chevron-back" size={14} color="#f49522" />
                                <Text style={styles.addActionButtonText}>Back to Vehicles</Text>
                            </TouchableOpacity>
                            <Text style={styles.title}>Add Vehicle</Text>
                            <Text style={styles.subtitle}>Step {currentStep} of {STEPS.length}</Text>
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        {STEPS.map((step) => (
                            <View
                                key={step.id}
                                style={[styles.filterChip, step.id === currentStep && styles.filterChipActive]}
                            >
                                <Text style={[styles.filterText, step.id === currentStep && styles.filterTextActive]}>
                                    {step.title}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.card}>
                        {currentStep === 1 ? (
                            <>
                                <Text style={styles.formLabel}>Registration Number *</Text>
                                <View style={styles.inputIconWrap}>
                                    <Ionicons name="car-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.formFieldWithIcon}
                                        placeholder="WP-1234"
                                        value={form.registrationNumber}
                                        onChangeText={(registrationNumber) => setForm((p) => ({ ...p, registrationNumber }))}
                                    />
                                </View>

                                <Text style={styles.formLabel}>Model *</Text>
                                <View style={styles.inputIconWrap}>
                                    <Ionicons name="construct-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.formFieldWithIcon}
                                        placeholder="e.g. Isuzu ELF"
                                        value={form.model}
                                        onChangeText={(model) => setForm((p) => ({ ...p, model }))}
                                    />
                                </View>

                                <Text style={styles.formLabel}>License Expiry Date *</Text>
                                <TouchableOpacity
                                    style={styles.selectField}
                                    onPress={openLicensePicker}
                                >
                                    <Text style={styles.selectFieldText}>
                                        {form.licenseEndDate ? new Date(form.licenseEndDate).toLocaleDateString() : 'Select date'}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#374151" />
                                </TouchableOpacity>

                                <Text style={styles.formLabel}>Insurance Expiry Date *</Text>
                                <TouchableOpacity
                                    style={styles.selectField}
                                    onPress={openInsurancePicker}
                                >
                                    <Text style={styles.selectFieldText}>
                                        {form.insuranceEndDate ? new Date(form.insuranceEndDate).toLocaleDateString() : 'Select date'}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color="#374151" />
                                </TouchableOpacity>
                            </>
                        ) : null}

                        {currentStep === 2 ? (
                            <>
                                <Text style={styles.formLabel}>Weight Capacity (kg) *</Text>
                                <View style={styles.inputIconWrap}>
                                    <Ionicons name="barbell-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.formFieldWithIcon}
                                        placeholder="e.g. 3500"
                                        value={form.weightCapacity}
                                        onChangeText={(weightCapacity) => setForm((p) => ({ ...p, weightCapacity }))}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={styles.formLabel}>Volume Capacity (m3) *</Text>
                                <View style={styles.inputIconWrap}>
                                    <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.formFieldWithIcon}
                                        placeholder="e.g. 16"
                                        value={form.volumeCapacity}
                                        onChangeText={(volumeCapacity) => setForm((p) => ({ ...p, volumeCapacity }))}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={styles.formLabel}>Fuel Consumption (km/l)</Text>
                                <View style={styles.inputIconWrap}>
                                    <Ionicons name="water-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.formFieldWithIcon}
                                        placeholder="e.g. 8.5"
                                        value={form.fuelConsumption}
                                        onChangeText={(fuelConsumption) => setForm((p) => ({ ...p, fuelConsumption }))}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </>
                        ) : null}

                        {currentStep === 3 ? (
                            <>
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
                            </>
                        ) : null}

                        {stepError ? <Text style={[styles.line, { color: '#DC2626' }]}>{stepError}</Text> : null}
                    </View>

                    <View style={styles.actions}>
                        {currentStep > 1 ? (
                            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={goBack}>
                                <Text style={styles.btnTextDanger}>Back</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => navigation.goBack()}>
                                <Text style={styles.btnTextDanger}>Cancel</Text>
                            </TouchableOpacity>
                        )}

                        {currentStep < 3 ? (
                            <TouchableOpacity
                                style={[styles.btn, styles.btnPrimary, !canMoveNext && { opacity: 0.6 }]}
                                onPress={goNext}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.btnTextPrimary}>Next</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.btn, styles.btnPrimary, loading && { opacity: 0.6 }]}
                                onPress={handleCreate}
                                disabled={loading}
                            >
                                <Text style={styles.btnTextPrimary}>{loading ? 'Creating...' : 'Create Vehicle'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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

            <Modal
                visible={Boolean(activeSelect)}
                transparent
                animationType="fade"
                onRequestClose={() => setActiveSelect(null)}
            >
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
                        <TouchableOpacity
                            style={[styles.formBtn, styles.formCancel, { alignSelf: 'flex-end', marginTop: 8 }]}
                            onPress={() => setActiveSelect(null)}
                        >
                            <Text style={styles.formCancelText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
