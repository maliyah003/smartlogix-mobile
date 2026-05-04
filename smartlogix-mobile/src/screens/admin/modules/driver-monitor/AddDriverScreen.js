import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../../../components/ScreenWrapper';
import { driverAPI } from '../../../../services/api';
import { styles } from './driverMonitor.styles';

const PHONE_REGEX = /^(?:0|\+94)[1-9]\d{8}$/;
const STEPS = [
    { id: 1, title: 'Basic' },
    { id: 2, title: 'Contact' },
    { id: 3, title: 'Work' },
];

const initialForm = {
    name: '',
    licenseNumber: '',
    contactNumber: '',
    experienceLevel: 'Junior',
    status: 'available',
};

const EXPERIENCE_OPTIONS = [
    { value: 'Junior', label: 'Junior (0-2 years)' },
    { value: 'Mid-Level', label: 'Mid-Level (2-5 years)' },
    { value: 'Senior', label: 'Senior (5+ years)' },
    { value: 'Expert', label: 'Expert (10+ years)' },
];

export default function AddDriverScreen({ navigation }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [activeSelect, setActiveSelect] = useState(null);

    const stepError = useMemo(() => {
        if (currentStep === 1) {
            if (!form.name.trim()) return 'Driver name is required.';
            if (!form.licenseNumber.trim()) return 'License number is required.';
        }
        if (currentStep === 2) {
            if (!PHONE_REGEX.test(form.contactNumber.replace(/\s|-/g, ''))) {
                return 'Enter a valid Sri Lankan contact number.';
            }
        }
        return null;
    }, [currentStep, form]);

    const canMoveNext = !stepError;
    const getOptionLabel = (options, value) =>
        options.find((opt) => opt.value === value)?.label || 'Select';

    const goNext = () => {
        if (stepError) {
            Alert.alert('Validation', stepError);
            return;
        }
        setCurrentStep((s) => Math.min(s + 1, 3));
    };

    const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

    const handleCreateDriver = async () => {
        if (stepError) {
            Alert.alert('Validation', stepError);
            return;
        }
        setLoading(true);
        try {
            const response = await driverAPI.create(form);
            const generatedEmail = response?.data?.generatedEmail || response?.data?.driver?.email;
            Alert.alert(
                'Driver Created',
                `Generated email: ${generatedEmail || 'N/A'}\n\nDriver can use this email in mobile login to set password.`,
                [{ text: 'OK', onPress: () => navigation.navigate('DriverMonitorHome', { refreshAt: Date.now() }) }]
            );
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to create driver.');
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
                                style={[styles.incidentActionButton, { alignSelf: 'flex-start', marginBottom: 10 }]}
                                onPress={() => navigation.navigate('DriverMonitorHome')}
                            >
                                <Ionicons name="chevron-back" size={14} color="#f49522" />
                                <Text style={styles.incidentActionButtonText}>Back to Driver Monitor</Text>
                            </TouchableOpacity>
                            <Text style={styles.title}>Add Driver</Text>
                            <Text style={styles.subtitle}>Step {currentStep} of {STEPS.length}</Text>
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        {STEPS.map((step) => (
                            <View
                                key={step.id}
                                style={[
                                    styles.filterChip,
                                    step.id === currentStep && styles.filterChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.filterText,
                                        step.id === currentStep && styles.filterTextActive,
                                    ]}
                                >
                                    {step.title}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.card}>
                        {currentStep === 1 ? (
                            <>
                                <Text style={styles.formLabel}>Full Name *</Text>
                                <View style={styles.inputIconWrap}>
                                    <Ionicons name="person-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.formFieldWithIcon}
                                        placeholder="Enter full name"
                                        value={form.name}
                                        onChangeText={(name) => setForm((p) => ({ ...p, name }))}
                                    />
                                </View>
                                <Text style={styles.formLabel}>License Number *</Text>
                                <View style={styles.inputIconWrap}>
                                    <Ionicons name="card-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.formFieldWithIcon}
                                        placeholder="Enter license number"
                                        value={form.licenseNumber}
                                        onChangeText={(licenseNumber) => setForm((p) => ({ ...p, licenseNumber }))}
                                    />
                                </View>
                            </>
                        ) : null}

                        {currentStep === 2 ? (
                            <>
                                <Text style={styles.formLabel}>Contact Number *</Text>
                                <View style={styles.inputIconWrap}>
                                    <Ionicons name="call-outline" size={18} color="#9CA3AF" />
                                    <TextInput
                                        style={styles.formFieldWithIcon}
                                        placeholder="0771234567 or +94771234567"
                                        value={form.contactNumber}
                                        onChangeText={(contactNumber) => setForm((p) => ({ ...p, contactNumber }))}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                                <View style={styles.helperBox}>
                                    <Text style={styles.helperText}>
                                        Email will be auto-generated after create.
                                    </Text>
                                </View>
                            </>
                        ) : null}

                        {currentStep === 3 ? (
                            <>
                                <Text style={styles.formLabel}>Experience Level</Text>
                                <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('experience')}>
                                    <Text style={styles.selectFieldText}>{getOptionLabel(EXPERIENCE_OPTIONS, form.experienceLevel)}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#374151" />
                                </TouchableOpacity>
                            </>
                        ) : null}

                        {stepError ? <Text style={[styles.line, { color: '#DC2626' }]}>{stepError}</Text> : null}
                    </View>

                    <View style={styles.row}>
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
                                onPress={handleCreateDriver}
                                disabled={loading}
                            >
                                <Text style={styles.btnTextPrimary}>{loading ? 'Creating...' : 'Create Driver'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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
                            {EXPERIENCE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={styles.sheetOption}
                                    onPress={() => {
                                        setForm((p) => ({ ...p, experienceLevel: opt.value }));
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
        </ScreenWrapper>
    );
}
