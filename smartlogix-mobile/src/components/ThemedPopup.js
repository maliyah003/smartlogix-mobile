import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Fonts, Shadows } from '../theme/ui';

export default function ThemedPopup({
    visible,
    title,
    message,
    buttons = [],
    onRequestClose,
}) {
    const resolvedButtons = buttons.length
        ? buttons
        : [{ label: 'OK', variant: 'primary', onPress: onRequestClose }];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    {title ? <Text style={styles.title}>{title}</Text> : null}
                    {message ? <Text style={styles.message}>{message}</Text> : null}

                    <View style={styles.buttonRow}>
                        {resolvedButtons.map((btn, index) => {
                            const variant = btn.variant || 'neutral';
                            const isPrimary = variant === 'primary';
                            const isDanger = variant === 'danger';
                            return (
                                <TouchableOpacity
                                    key={`${btn.label}-${index}`}
                                    style={[
                                        styles.button,
                                        isPrimary && styles.buttonPrimary,
                                        isDanger && styles.buttonDanger,
                                        !isPrimary && !isDanger && styles.buttonNeutral,
                                    ]}
                                    onPress={btn.onPress}
                                >
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            isPrimary && styles.buttonTextPrimary,
                                            isDanger && styles.buttonTextDanger,
                                            !isPrimary && !isDanger && styles.buttonTextNeutral,
                                        ]}
                                    >
                                        {btn.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    title: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: Colors.textSecondary,
        lineHeight: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 16,
    },
    button: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minWidth: 90,
        alignItems: 'center',
    },
    buttonNeutral: {
        backgroundColor: '#F3F4F6',
    },
    buttonPrimary: {
        backgroundColor: Colors.brandOrange,
    },
    buttonDanger: {
        backgroundColor: '#FEE2E2',
    },
    buttonText: {
        fontSize: 13,
        fontFamily: Fonts.bold,
    },
    buttonTextNeutral: {
        color: Colors.textSecondary,
    },
    buttonTextPrimary: {
        color: '#fff',
    },
    buttonTextDanger: {
        color: Colors.danger,
    },
});
