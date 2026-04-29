import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { driverAPI } from '../../../../services/api';
import { styles } from './driverMonitor.styles';

const PHONE_REGEX = /^(?:0|\+94)[1-9]\d{8}$/;
const EXPERIENCE_OPTIONS = [
    { value: 'Junior', label: 'Junior (0-2 years)' },
    { value: 'Mid-Level', label: 'Mid-Level (2-5 years)' },
    { value: 'Senior', label: 'Senior (5+ years)' },
    { value: 'Expert', label: 'Expert (10+ years)' },
];
const STATUS_OPTIONS = [
    { value: 'available', label: 'Available' },
    { value: 'on-trip', label: 'On Trip' },
    { value: 'off-duty', label: 'Off Duty' },
];

const initialData = {
    name: '',
    licenseNumber: '',
    contactNumber: '',
    experienceLevel: 'Junior',
    status: 'available',
};

export default function DriverFormModal({ visible, onClose, onSaved, editingDriver }) {
    const [form, setForm] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [activeSelect, setActiveSelect] = useState(null);

    useEffect(() => {
        if (editingDriver) {
            setForm({
                name: editingDriver.name || '',
                licenseNumber: editingDriver.licenseNumber || '',
                contactNumber: editingDriver.contactNumber || '',
                experienceLevel: editingDriver.experienceLevel || 'Junior',
                status: editingDriver.status || 'available',
            });
            return;
        }
        setForm(initialData);
    }, [editingDriver, visible]);

    const getOptionLabel = (options, value) =>
        options.find((opt) => opt.value === value)?.label || 'Select';

    const validate = () => {
        if (!form.name.trim()) return 'Driver name is required.';
        if (!form.licenseNumber.trim()) return 'License number is required.';
        if (!PHONE_REGEX.test(form.contactNumber.replace(/\s|-/g, ''))) {
            return 'Enter a valid Sri Lankan contact number.';
        }
        return null;
    };

    const handleSubmit = async () => {
        const error = validate();
        if (error) {
            Alert.alert('Validation', error);
            return;
        }
        setLoading(true);
        try {
            let response;
            if (editingDriver?._id) {
                response = await driverAPI.update(editingDriver._id, form);
            } else {
                response = await driverAPI.create(form);
            }
            onSaved?.();
            onClose?.();

            if (!editingDriver?._id) {
                const generatedEmail = response?.data?.generatedEmail || response?.data?.driver?.email;
                if (generatedEmail) {
                    Alert.alert(
                        'Driver Created',
                        `Generated email: ${generatedEmail}\n\nDriver can use this email in mobile login to set their password.`
                    );
                }
            }
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to save driver.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.formOverlay}>
                <View style={styles.formCard}>
                    <ScrollView contentContainerStyle={styles.formScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.formTitle}>{editingDriver ? 'Edit Driver' : 'Add Driver'}</Text>

                        <Text style={styles.formLabel}>Full Name *</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="person-outline" size={18} color="#9CA3AF" />
                            <TextInput style={styles.formFieldWithIcon} placeholder="Enter full name" value={form.name} onChangeText={(name) => setForm((p) => ({ ...p, name }))} />
                        </View>

                        <Text style={styles.formLabel}>License Number *</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="card-outline" size={18} color="#9CA3AF" />
                            <TextInput style={styles.formFieldWithIcon} placeholder="Enter license number" value={form.licenseNumber} onChangeText={(licenseNumber) => setForm((p) => ({ ...p, licenseNumber }))} />
                        </View>

                        <Text style={styles.formLabel}>Contact Number *</Text>
                        <View style={styles.inputIconWrap}>
                            <Ionicons name="call-outline" size={18} color="#9CA3AF" />
                            <TextInput style={styles.formFieldWithIcon} placeholder="0771234567 or +94771234567" value={form.contactNumber} onChangeText={(contactNumber) => setForm((p) => ({ ...p, contactNumber }))} keyboardType="phone-pad" />
                        </View>

                        <Text style={styles.formLabel}>Email</Text>
                        <TextInput style={styles.formFieldReadOnly} value={editingDriver?.email || 'No email'} editable={false} />

                        <Text style={styles.formLabel}>Experience Level</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('experience')}>
                            <Text style={styles.selectFieldText}>{getOptionLabel(EXPERIENCE_OPTIONS, form.experienceLevel)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#374151" />
                        </TouchableOpacity>

                        <Text style={styles.formLabel}>Status</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('status')}>
                            <Text style={styles.selectFieldText}>{getOptionLabel(STATUS_OPTIONS, form.status)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#374151" />
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
                            {(activeSelect === 'experience' ? EXPERIENCE_OPTIONS : STATUS_OPTIONS).map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={styles.sheetOption}
                                    onPress={() => {
                                        if (activeSelect === 'experience') {
                                            setForm((p) => ({ ...p, experienceLevel: opt.value }));
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
        </Modal>
    );
}
