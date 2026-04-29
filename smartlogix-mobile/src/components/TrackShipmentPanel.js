import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PageLoading from './PageLoading';
import { Colors, Fonts, Shadows } from '../theme/ui';

const formatTrackingId = (value) => {
    const raw = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!raw) return '';

    // Force the public tracking prefix to JOB-2026-
    const typedSuffix = raw.startsWith('JOB2026') ? raw.slice(7) : raw.replace(/^JOB/, '').replace(/^2026/, '');
    const safeSuffix = typedSuffix.slice(0, 12);

    return `JOB-2026-${safeSuffix}`;
};

export default function TrackShipmentPanel({ onTrack }) {
    const [trackingId, setTrackingId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTrack = async () => {
        const nextTrackingId = trackingId.trim();
        if (!nextTrackingId) return;

        setLoading(true);
        setError('');

        try {
            await Promise.resolve(onTrack?.(nextTrackingId));
        } catch (err) {
            setError('Could not open tracking page.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <View style={styles.headerIcon}>
                    <Ionicons name="search" size={18} color={Colors.brandOrange} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Track your shipment</Text>
                    <Text style={styles.subtitle}>Enter the Job ID to view the latest delivery progress.</Text>
                </View>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Tracking ID</Text>
                <View style={styles.inputRow}>
                    <Ionicons name="barcode-outline" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.input}
                        value={trackingId}
                        onChangeText={(value) => setTrackingId(formatTrackingId(value))}
                        placeholder="JOB-2026-0001"
                        placeholderTextColor={Colors.textTertiary}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleTrack}
                disabled={loading || !trackingId.trim()}
            >
                {loading ? (
                    <PageLoading size={22} color="#fff" />
                ) : (
                    <Text style={styles.submitText}>Track shipment</Text>
                )}
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginTop: 14,
        backgroundColor: Colors.surface,
        borderRadius: 18,
        padding: 18,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F1E4D0',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 16,
    },
    headerIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF1E4',
    },
    title: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
    },
    subtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: Fonts.regular,
        color: Colors.textSecondary,
    },
    formGroup: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        fontFamily: Fonts.semibold,
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FAFAFA',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 14,
        minHeight: 54,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontFamily: Fonts.medium,
        color: Colors.textPrimary,
    },
    submitButton: {
        backgroundColor: Colors.brandOrange,
        borderRadius: 14,
        minHeight: 54,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    submitButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    submitText: {
        fontSize: 15,
        fontFamily: Fonts.bold,
        color: '#FFFFFF',
    },
    errorText: {
        marginTop: 12,
        color: Colors.danger,
        fontFamily: Fonts.medium,
        fontSize: 13,
    },
});