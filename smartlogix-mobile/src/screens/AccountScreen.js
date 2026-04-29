import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';
import ThemedPopup from '../components/ThemedPopup';
import { driverAPI } from '../services/api';
import { useFocusEffect } from '@react-navigation/native';

export default function AccountScreen({ navigation }) {
    const [driverData, setDriverData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [monthlyScore, setMonthlyScore] = useState(null);

    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [popup, setPopup] = useState({ visible: false, title: '', message: '', buttons: [] });

    const showPopup = (title, message, buttons = null) => {
        setPopup({
            visible: true,
            title,
            message,
            buttons: buttons || [{ label: 'OK', variant: 'primary', onPress: () => setPopup((p) => ({ ...p, visible: false })) }],
        });
    };

    const loadProfile = async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const dataStr = await AsyncStorage.getItem('driverData');
            const isAdminStr = await AsyncStorage.getItem('isAdmin');
            const adminFlag = isAdminStr ? JSON.parse(isAdminStr) : false;
            setIsAdmin(Boolean(adminFlag));
            if (dataStr) {
                const parsed = JSON.parse(dataStr);
                setDriverData(parsed);

                if (!adminFlag && parsed?._id) {
                    try {
                        const scoreRes = await driverAPI.getMonthlyScore(parsed._id);
                        setMonthlyScore(scoreRes.data?.score?.score ?? null);
                    } catch {
                        setMonthlyScore(null);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to load profile", error);
            showPopup('Error', 'Could not load driver profile.');
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            loadProfile(false);
        }, [])
    );

    const handleLogout = async () => {
        showPopup('Logout', 'Are you sure you want to log out?', [
            { label: 'Cancel', variant: 'neutral', onPress: () => setPopup((p) => ({ ...p, visible: false })) },
            {
                label: 'Logout',
                variant: 'danger',
                onPress: async () => {
                    setPopup((p) => ({ ...p, visible: false }));
                    await AsyncStorage.clear();
                    navigation.getParent()?.replace('Login');
                },
            },
        ]);
    };

    const handleChangePassword = async () => {
        if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
            showPopup('Validation', 'Please fill in all password fields.');
            return;
        }
        if (newPassword.length < 6) {
            showPopup('Validation', 'New password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            showPopup('Validation', 'New password and confirm password do not match.');
            return;
        }
        if (!driverData?._id) {
            showPopup('Error', 'User profile could not be loaded.');
            return;
        }

        try {
            setSavingPassword(true);
            await driverAPI.changePassword(driverData._id, {
                currentPassword,
                newPassword,
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowChangePassword(false);
            showPopup('Success', 'Password changed successfully.');
        } catch (error) {
            showPopup('Error', error.response?.data?.error || 'Failed to change password.');
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return <PageLoading fullScreen />;
    }

    if (!driverData) {
        return (
            <View style={styles.centerContainer}>
                <Text>No driver data found.</Text>
            </View>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* Header / Avatar Area */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitials}>
                            {driverData.name ? driverData.name.charAt(0).toUpperCase() : 'D'}
                        </Text>
                    </View>
                    <Text style={styles.driverName}>{driverData.name}</Text>
                    {!isAdmin ? (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{driverData.experienceLevel || 'Junior'}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Driver-only metrics */}
                {!isAdmin ? (
                    <View style={styles.metricsContainer}>
                        <View style={styles.metricCard}>
                            <Ionicons name="trophy" size={24} color="#F59E0B" />
                            <Text style={styles.metricValue}>{monthlyScore == null ? '—' : monthlyScore}</Text>
                            <Text style={styles.metricLabel}>Driver Score (Monthly)</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <Ionicons name="card" size={24} color="#3B82F6" />
                            <Text style={styles.metricValue}>{driverData.licenseNumber || 'N/A'}</Text>
                            <Text style={styles.metricLabel}>License</Text>
                        </View>
                    </View>
                ) : null}

                {/* Contact / Profile Details */}
                <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Profile Information</Text>

                    <View style={styles.detailRow}>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailLabel}>Email</Text>
                            <Text style={styles.detailValue}>{driverData.email}</Text>
                        </View>
                    </View>

                    {!isAdmin ? (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.detailRow}>
                                <View style={styles.detailTextContainer}>
                                    <Text style={styles.detailLabel}>Phone Number</Text>
                                    <Text style={styles.detailValue}>{driverData.contactNumber || 'N/A'}</Text>
                                </View>
                            </View>
                        </>
                    ) : null}
                </View>

                <TouchableOpacity style={styles.changePasswordEntry} onPress={() => setShowChangePassword(true)}>
                    <Ionicons name="key-outline" size={18} color={Colors.brandOrange} />
                    <Text style={styles.changePasswordEntryText}>Change Password</Text>
                </TouchableOpacity>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.logoutIcon} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>SmartLogix App v2.0.1</Text>
            </ScrollView>

            <Modal
                transparent
                animationType="slide"
                visible={showChangePassword}
                onRequestClose={() => setShowChangePassword(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                    keyboardVerticalOffset={40}
                >
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => setShowChangePassword(false)} disabled={savingPassword}>
                                <Ionicons name="close" size={22} color={Colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <Text style={styles.detailLabel}>Current Password</Text>
                            <TextInput
                                style={styles.input}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                placeholder="Enter current password"
                                placeholderTextColor={Colors.textTertiary}
                                secureTextEntry
                            />

                            <Text style={[styles.detailLabel, styles.inputLabelSpacing]}>New Password</Text>
                            <TextInput
                                style={styles.input}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                placeholder="Enter new password"
                                placeholderTextColor={Colors.textTertiary}
                                secureTextEntry
                            />

                            <Text style={[styles.detailLabel, styles.inputLabelSpacing]}>Confirm New Password</Text>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm new password"
                                placeholderTextColor={Colors.textTertiary}
                                secureTextEntry
                            />

                            <View style={styles.modalActionsRow}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setShowChangePassword(false)}
                                    disabled={savingPassword}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalSaveBtn, savingPassword && styles.buttonDisabled]}
                                    onPress={handleChangePassword}
                                    disabled={savingPassword}
                                >
                                    <Text style={styles.modalSaveText}>{savingPassword ? 'Updating...' : 'Update'}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.bg,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarInitials: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: '#4F46E5', // Indigo-600
    },
    driverName: {
        fontSize: 22,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    badgeContainer: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: Fonts.medium,
        color: '#D97706',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    metricCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 6,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    metricValue: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginTop: 8,
        marginBottom: 2,
    },
    metricLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontFamily: Fonts.medium,
        textAlign: 'center',
    },
    detailsSection: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        ...Shadows.card,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailTextContainer: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: Colors.textTertiary,
        fontFamily: Fonts.regular,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 15,
        color: Colors.textPrimary,
        fontFamily: Fonts.medium,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 16,
    },
    inputLabelSpacing: {
        marginTop: 14,
    },
    input: {
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: '#F8F9FB',
        paddingHorizontal: 14,
        color: Colors.textPrimary,
        fontFamily: Fonts.regular,
        fontSize: 15,
    },
    changePasswordEntry: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFF8F0',
        borderColor: '#F7C98F',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 18,
    },
    changePasswordEntryText: {
        fontFamily: Fonts.bold,
        color: Colors.brandOrange,
        fontSize: 15,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
        padding: 12,
    },
    modalCard: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        padding: 16,
        maxHeight: '85%',
        ...Shadows.card,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontFamily: Fonts.bold,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    modalActionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    modalCancelBtn: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalCancelText: {
        fontFamily: Fonts.bold,
        color: Colors.textSecondary,
    },
    modalSaveBtn: {
        flex: 1,
        backgroundColor: Colors.brandOrange,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalSaveText: {
        fontFamily: Fonts.bold,
        color: '#fff',
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#FEF2F2', // red-50
        borderRadius: 12,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FCA5A5', // red-300
        marginBottom: 24,
    },
    logoutIcon: {
        marginRight: 8,
    },
    logoutText: {
        color: '#EF4444', // red-500
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    versionText: {
        textAlign: 'center',
        color: Colors.textTertiary,
        fontFamily: Fonts.regular,
        fontSize: 12,
    }
});
