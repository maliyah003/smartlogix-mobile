import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { driverAPI } from '../../../../services/api';
import { styles } from './driverMonitor.styles';

const CATEGORY_OPTIONS = [
    { value: 'accident', label: 'Accident / Collision' },
    { value: 'complaint', label: 'Customer Complaint' },
    { value: 'delay', label: 'Delivery Delay' },
    { value: 'missed_delivery', label: 'Missed Delivery' },
    { value: 'vehicle_issue', label: 'Vehicle Issue' },
    { value: 'traffic_violation', label: 'Traffic Violation' },
];

const severityOptionsFor = (category) => {
    if (category === 'complaint' || category === 'traffic_violation') {
        return [
            { value: 'minor', label: 'Minor' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'serious', label: 'Serious' },
        ];
    }
    if (category === 'delay') {
        return [
            { value: 'minor', label: '10-30 mins' },
            { value: 'moderate', label: '30-60 mins' },
            { value: 'major', label: '60+ mins' },
        ];
    }
    if (category === 'missed_delivery') {
        return [
            { value: 'minor', label: 'With valid reason' },
            { value: 'major', label: 'Without valid reason' },
        ];
    }
    return [
        { value: 'minor', label: 'Minor' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'major', label: 'Major' },
    ];
};

const initialIncident = {
    category: 'accident',
    severity: 'minor',
    verified: 'yes',
    occurredAt: new Date().toISOString(),
    delayMinutes: '',
    delayReason: 'traffic',
    missedValidReason: 'yes',
};

export default function IncidentFormModal({ visible, onClose, onSaved, driver }) {
    const [incident, setIncident] = useState(initialIncident);
    const [loading, setLoading] = useState(false);
    const [activeSelect, setActiveSelect] = useState(null);
    const [showOccurredAtPicker, setShowOccurredAtPicker] = useState(false);
    const [occurredAtDraft, setOccurredAtDraft] = useState(new Date());

    useEffect(() => {
        setIncident(initialIncident);
        setOccurredAtDraft(new Date());
    }, [visible]);

    if (!driver) return null;

    const severityOptions = severityOptionsFor(incident.category);
    const verifiedOptions = [
        { value: 'yes', label: 'Yes (Supervisor/Verified)' },
        { value: 'no', label: 'No' },
    ];
    const delayReasonOptions = [
        { value: 'traffic', label: 'Traffic (-50%)' },
        { value: 'weather', label: 'Weather (-50%)' },
        { value: 'other', label: 'Other' },
    ];
    const validReasonOptions = [
        { value: 'yes', label: 'Yes (with valid reason)' },
        { value: 'no', label: 'No (without valid reason)' },
    ];

    const getOptionLabel = (options, value) =>
        options.find((opt) => opt.value === value)?.label || 'Select';

    const openOccurredAtPicker = () => {
        const initialDate = incident.occurredAt ? new Date(incident.occurredAt) : new Date();
        setOccurredAtDraft(Number.isNaN(initialDate.getTime()) ? new Date() : initialDate);
        setShowOccurredAtPicker(true);
    };

    const buildMeta = () => {
        if (incident.category === 'delay') {
            return { delayMinutes: Number(incident.delayMinutes), reason: incident.delayReason };
        }
        if (incident.category === 'missed_delivery') {
            return { validReason: incident.missedValidReason === 'yes' };
        }
        return {};
    };

    const handleSubmit = async () => {
        if (!incident.category || !incident.severity) {
            Alert.alert('Validation', 'Category and severity are required.');
            return;
        }
        if (incident.category === 'delay' && (!incident.delayMinutes || Number(incident.delayMinutes) < 0)) {
            Alert.alert('Validation', 'Delay minutes should be zero or positive.');
            return;
        }

        setLoading(true);
        try {
            await driverAPI.addIncident(driver._id, {
                category: incident.category,
                severity: incident.severity,
                verified: incident.verified === 'yes',
                occurredAt: new Date(incident.occurredAt).toISOString(),
                meta: buildMeta(),
            });
            onSaved?.();
            onClose?.();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to add incident.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.formOverlay}
                keyboardVerticalOffset={30}
            >
                <View style={styles.formCard}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.formScrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.formTitle}>Add Incident</Text>
                        <Text style={styles.line}>{driver.name}</Text>

                        <Text style={styles.formLabel}>Category *</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('category')}>
                            <Text style={styles.selectFieldText}>{getOptionLabel(CATEGORY_OPTIONS, incident.category)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#374151" />
                        </TouchableOpacity>

                        <Text style={styles.formLabel}>Severity *</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('severity')}>
                            <Text style={styles.selectFieldText}>{getOptionLabel(severityOptions, incident.severity)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#374151" />
                        </TouchableOpacity>

                        <Text style={styles.formLabel}>Verified</Text>
                        <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('verified')}>
                            <Text style={styles.selectFieldText}>{getOptionLabel(verifiedOptions, incident.verified)}</Text>
                            <Ionicons name="chevron-down" size={20} color="#374151" />
                        </TouchableOpacity>

                        <Text style={styles.formLabel}>Occurred At *</Text>
                        <TouchableOpacity style={styles.selectField} onPress={openOccurredAtPicker}>
                            <Text style={styles.selectFieldText}>
                                {incident.occurredAt ? new Date(incident.occurredAt).toLocaleString() : 'Select date'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#374151" />
                        </TouchableOpacity>

                        {incident.category === 'delay' ? (
                            <>
                                <Text style={styles.formLabel}>Delay Minutes *</Text>
                                <TextInput
                                    style={styles.formField}
                                    placeholder="e.g. 42"
                                    value={incident.delayMinutes}
                                    onChangeText={(delayMinutes) => setIncident((p) => ({ ...p, delayMinutes }))}
                                    keyboardType="numeric"
                                />
                                <Text style={styles.formLabel}>Delay Reason</Text>
                                <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('delayReason')}>
                                    <Text style={styles.selectFieldText}>{getOptionLabel(delayReasonOptions, incident.delayReason)}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#374151" />
                                </TouchableOpacity>
                            </>
                        ) : null}

                        {incident.category === 'missed_delivery' ? (
                            <>
                                <Text style={styles.formLabel}>Valid Reason?</Text>
                                <TouchableOpacity style={styles.selectField} onPress={() => setActiveSelect('missedValidReason')}>
                                    <Text style={styles.selectFieldText}>{getOptionLabel(validReasonOptions, incident.missedValidReason)}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#374151" />
                                </TouchableOpacity>
                            </>
                        ) : null}

                        <View style={styles.formActions}>
                            <TouchableOpacity style={[styles.formBtn, styles.formCancel]} onPress={onClose} disabled={loading}>
                                <Text style={styles.formCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.formBtn, styles.formSubmit]} onPress={handleSubmit} disabled={loading}>
                                <Text style={styles.formSubmitText}>{loading ? 'Saving...' : 'Save Incident'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            <Modal
                visible={showOccurredAtPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowOccurredAtPicker(false)}
            >
                <View style={styles.sheetOverlay}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.sheetTitle}>Select Date & Time</Text>
                        <DateTimePicker
                            value={occurredAtDraft}
                            mode="datetime"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                if (Platform.OS === 'android') {
                                    setShowOccurredAtPicker(false);
                                    if (event.type === 'set' && date) {
                                        setIncident((p) => ({ ...p, occurredAt: new Date(date).toISOString() }));
                                    }
                                    return;
                                }
                                if (date) setOccurredAtDraft(date);
                            }}
                        />
                        {Platform.OS === 'ios' ? (
                            <View style={styles.formActions}>
                                <TouchableOpacity
                                    style={[styles.formBtn, styles.formCancel]}
                                    onPress={() => setShowOccurredAtPicker(false)}
                                >
                                    <Text style={styles.formCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.formBtn, styles.formSubmit]}
                                    onPress={() => {
                                        setIncident((p) => ({ ...p, occurredAt: new Date(occurredAtDraft).toISOString() }));
                                        setShowOccurredAtPicker(false);
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
                            {(activeSelect === 'category'
                                ? CATEGORY_OPTIONS
                                : activeSelect === 'severity'
                                  ? severityOptions
                                  : activeSelect === 'verified'
                                    ? verifiedOptions
                                    : activeSelect === 'delayReason'
                                      ? delayReasonOptions
                                      : validReasonOptions
                            ).map((opt) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={styles.sheetOption}
                                    onPress={() => {
                                        if (activeSelect === 'category') {
                                            const nextSeverity = severityOptionsFor(opt.value)[0]?.value || 'minor';
                                            setIncident((p) => ({ ...p, category: opt.value, severity: nextSeverity }));
                                        } else if (activeSelect === 'severity') {
                                            setIncident((p) => ({ ...p, severity: opt.value }));
                                        } else if (activeSelect === 'verified') {
                                            setIncident((p) => ({ ...p, verified: opt.value }));
                                        } else if (activeSelect === 'delayReason') {
                                            setIncident((p) => ({ ...p, delayReason: opt.value }));
                                        } else {
                                            setIncident((p) => ({ ...p, missedValidReason: opt.value }));
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
