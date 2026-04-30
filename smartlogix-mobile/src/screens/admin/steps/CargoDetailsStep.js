import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../../theme/ui';

const CARGO_TYPES = ['general', 'fragile', 'perishable', 'hazardous', 'oversized'];

export default function CargoDetailsStep({ data, onChange }) {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
                <Text style={styles.label}>Weight (kg) *</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="scale" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter weight in kilograms"
                        placeholderTextColor={Colors.textTertiary}
                        value={data.weight.toString()}
                        onChangeText={(value) => onChange({ ...data, weight: value })}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Volume (m³) *</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="cube" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter volume in cubic meters"
                        placeholderTextColor={Colors.textTertiary}
                        value={data.volume.toString()}
                        onChangeText={(value) => onChange({ ...data, volume: value })}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="What are you shipping?"
                    placeholderTextColor={Colors.textTertiary}
                    value={data.description}
                    onChangeText={(value) => onChange({ ...data, description: value })}
                    multiline
                    numberOfLines={3}
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Cargo Type</Text>
                <View style={styles.typeGrid}>
                    {CARGO_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.typeButton,
                                data.type === type && styles.typeButtonActive
                            ]}
                            onPress={() => onChange({ ...data, type })}
                        >
                            <Text style={[
                                styles.typeButtonText,
                                data.type === type && styles.typeButtonTextActive
                            ]}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    section: { marginBottom: 18 },
    label: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, minHeight: 50 },
    input: { flex: 1, fontSize: 15, fontFamily: Fonts.regular, color: Colors.textPrimary, marginLeft: 10, minHeight: 50 },
    textArea: { minHeight: 100, paddingVertical: 12, textAlignVertical: 'top' },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeButton: { flex: 1, minWidth: '48%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
    typeButtonActive: { backgroundColor: Colors.brandOrange, borderColor: Colors.brandOrange },
    typeButtonText: { fontSize: 13, fontFamily: Fonts.medium, color: Colors.textSecondary },
    typeButtonTextActive: { color: '#fff' }
});
