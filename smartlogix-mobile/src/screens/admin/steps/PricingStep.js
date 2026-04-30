import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../../theme/ui';

export default function PricingStep({ data, onChange }) {
    return (
        <View style={styles.container}>
            <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>Enter the quoted price for this shipment. The system will optimize costs based on vehicle capacity and route efficiency.</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Quoted Price (LKR) *</Text>
                <View style={styles.inputWrapper}>
                    <Text style={styles.currency}>LKR</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={Colors.textTertiary}
                        value={data.quotedPrice.toString()}
                        onChangeText={(value) => onChange({ ...data, quotedPrice: value })}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 16 },
    infoBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#BFDBFE' },
    infoText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: '#1E40AF', lineHeight: 18 },
    section: { marginBottom: 16 },
    label: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, minHeight: 50 },
    currency: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.textSecondary, marginRight: 8 },
    input: { flex: 1, fontSize: 18, fontFamily: Fonts.bold, color: Colors.textPrimary, minHeight: 50 }
});
