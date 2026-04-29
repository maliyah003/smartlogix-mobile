import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../../theme/ui';

export default function CustomerDetailsStep({ data, onChange }) {
    return (
        <View style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.label}>Full Name *</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="person" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor={Colors.textTertiary}
                        value={data.name}
                        onChangeText={(value) => onChange({ ...data, name: value.replace(/[^a-zA-Z\s]/g, '') })}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Phone Number *</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="call" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.input}
                        placeholder="0712345678 or +94712345678"
                        placeholderTextColor={Colors.textTertiary}
                        value={data.phone}
                        onChangeText={(value) => onChange({ ...data, phone: value })}
                        keyboardType="phone-pad"
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputWrapper}>
                    <Ionicons name="mail" size={18} color={Colors.textTertiary} />
                    <TextInput
                        style={styles.input}
                        placeholder="john@example.com"
                        placeholderTextColor={Colors.textTertiary}
                        value={data.email}
                        onChangeText={(value) => onChange({ ...data, email: value })}
                        keyboardType="email-address"
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 4 },
    section: { marginBottom: 16 },
    label: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, minHeight: 50 },
    input: { flex: 1, fontSize: 15, fontFamily: Fonts.regular, color: Colors.textPrimary, marginLeft: 10, minHeight: 50 }
});
