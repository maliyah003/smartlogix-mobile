import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image as RNImage,
    SafeAreaView as RNSafeAreaView
} from 'react-native';
import { Image as RNExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import TrackShipmentPanel from '../components/TrackShipmentPanel';

export default function LoginScreen({ navigation }) {
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isNewDriver, setIsNewDriver] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showTrackingPanel, setShowTrackingPanel] = useState(false);

    const getEmail = () => {
        const value = username.trim().toLowerCase();
        if (!value) return '';
        // Accept both full email and username inputs
        if (value.includes('@')) return value;
        return `${value}@smartlogix.com`;
    };

    const handleNext = async () => {
        if (!username.trim()) {
            Alert.alert('Error', 'Please enter your username or email');
            return;
        }

        setLoading(true);
        try {
            const email = getEmail();
            const response = await authAPI.checkStatus(email);

            if (response.data.success) {
                setIsNewDriver(response.data.isNew);
                setStep(2);
            }
        } catch (error) {
            console.error('Check status error:', error);
            const msg = error.response?.data?.error || 'Failed to verify user. Please try again.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        if (isNewDriver) {
            if (!confirmPassword.trim()) {
                Alert.alert('Error', 'Please confirm your password');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Error', 'Passwords do not match');
                return;
            }
            if (password.length < 6) {
                Alert.alert('Error', 'Password must be at least 6 characters long');
                return;
            }
        }

        setLoading(true);
        try {
            const email = getEmail();
            const response = await authAPI.login(email, password);

            if (response.data.success) {
                await AsyncStorage.setItem('driverToken', response.data.token);
                await AsyncStorage.setItem('driverData', JSON.stringify(response.data.driver));
                await AsyncStorage.setItem('isAdmin', JSON.stringify(response.data.isAdmin));
                if (response.data.isAdmin) {
                    navigation.replace('AdminTabs');
                } else {
                    navigation.replace('MainTabs');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            const msg = error.response?.data?.error || 'Failed to login. Please try again.';
            Alert.alert('Login Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper withKeyboard={true}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Content Section */}
                <View style={styles.content}>
                    {/* Logo and Brand */}
                    <View style={styles.brandSection}>
                        <RNImage
                            source={require('../../assets/images/SmartLogixLOGO.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.welcomeTitle}>Welcome</Text>
                        <Text style={styles.welcomeSubtitle}>back!</Text>
                    </View>

                    {/* Form Section */}
                    <View style={styles.form}>
                        {step === 1 ? (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Username or Email</Text>
                                    <View style={styles.inputWrapper}>
                                        <View style={styles.prefixIcon}>
                                            <Ionicons name="person-outline" size={18} color={Colors.brandOrange} />
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter username or email"
                                            placeholderTextColor={Colors.textTertiary}
                                            value={username}
                                            onChangeText={setUsername}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            editable={!loading}
                                        />
                                        {!username.includes('@') ? (
                                            <Text style={styles.emailSuffix}>@smartlogix.com</Text>
                                        ) : null}
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                    onPress={handleNext}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <PageLoading size={24} color="#fff" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Next</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.trackButton}
                                    onPress={() => setShowTrackingPanel((current) => !current)}
                                >
                                    <Ionicons name="search" size={18} color={Colors.brandOrange} />
                                    <Text style={styles.trackButtonText}>
                                        {showTrackingPanel ? 'Hide shipment tracker' : 'Track your shipment'}
                                    </Text>
                                </TouchableOpacity>

                                {showTrackingPanel ? (
                                    <TrackShipmentPanel
                                        onTrack={(jobId) => navigation.navigate('TrackingDetails', { jobId })}
                                    />
                                ) : null}
                            </>
                        ) : (
                            <>
                                {/* Email Display */}
                                <View style={styles.emailDisplay}>
                                    <View style={styles.emailInfo}>
                                        <Text style={styles.emailLabel}>Signing in as</Text>
                                        <Text style={styles.emailText}>{getEmail()}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setStep(1)}>
                                        <Text style={styles.changeText}>Change</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>{isNewDriver ? "Create Password" : "Password"}</Text>
                                    <View style={styles.inputWrapper}>
                                        <View style={styles.prefixIcon}>
                                            <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} />
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder={isNewDriver ? "Enter new password" : "••••••••"}
                                            placeholderTextColor={Colors.textTertiary}
                                            secureTextEntry={!showPassword}
                                            value={password}
                                            onChangeText={setPassword}
                                            autoFocus={true}
                                        />
                                        <TouchableOpacity
                                            style={styles.suffixIcon}
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <Ionicons
                                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color={Colors.textTertiary}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {isNewDriver && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Confirm Password</Text>
                                        <View style={styles.inputWrapper}>
                                            <View style={styles.prefixIcon}>
                                                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.textTertiary} />
                                            </View>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Confirm password"
                                                placeholderTextColor={Colors.textTertiary}
                                                secureTextEntry={!showConfirmPassword}
                                                value={confirmPassword}
                                                onChangeText={setConfirmPassword}
                                            />
                                            <TouchableOpacity
                                                style={styles.suffixIcon}
                                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                <Ionicons
                                                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                                    size={20}
                                                    color={Colors.textTertiary}
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity style={styles.forgotPassword}>
                                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.primaryButton, loading && styles.buttonDisabled]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <PageLoading size={24} color="#fff" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>
                                            {isNewDriver ? "Set Password & Sign in" : "Sign in"}
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.trackButton}
                                    onPress={() => setShowTrackingPanel((current) => !current)}
                                >
                                    <Ionicons name="search" size={18} color={Colors.brandOrange} />
                                    <Text style={styles.trackButtonText}>
                                        {showTrackingPanel ? 'Hide shipment tracker' : 'Track your shipment'}
                                    </Text>
                                </TouchableOpacity>

                                {showTrackingPanel ? (
                                    <TrackShipmentPanel
                                        onTrack={(jobId) => navigation.navigate('TrackingDetails', { jobId })}
                                    />
                                ) : null}
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    header: {
        marginTop: 20,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F8F9FB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    brandSection: {
        marginTop: 75,
        marginBottom: 40,
    },
    logo: {
        width: 220,
        height: 90,
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    welcomeTitle: {
        fontSize: 48,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        lineHeight: 52,
    },
    welcomeSubtitle: {
        fontSize: 48,
        fontFamily: Fonts.bold,
        color: Colors.textPrimary,
        lineHeight: 52,
    },
    form: {
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: Fonts.medium,
        color: Colors.textSecondary,
        marginBottom: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FB',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    prefixIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: Fonts.regular,
        color: Colors.textPrimary,
        height: '100%',
    },
    emailSuffix: {
        fontSize: 14,
        fontFamily: Fonts.medium,
        color: Colors.textTertiary,
        marginLeft: 4,
    },
    suffixIcon: {
        padding: 8,
    },
    emailDisplay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F3F7FE',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5EDFF',
    },
    emailInfo: {
        flex: 1,
    },
    emailLabel: {
        fontSize: 12,
        fontFamily: Fonts.medium,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    emailText: {
        fontSize: 15,
        fontFamily: Fonts.semibold,
        color: Colors.brandOrange,
    },
    changeText: {
        fontSize: 14,
        fontFamily: Fonts.bold,
        color: Colors.link,
        paddingLeft: 10,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 30,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontFamily: Fonts.semibold,
        color: Colors.link,
    },
    primaryButton: {
        backgroundColor: Colors.brandOrange,
        borderRadius: 16,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.card,
        shadowColor: Colors.brandOrange,
        shadowOpacity: 0.3,
    },
    buttonDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
    },
    primaryButtonText: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#FFFFFF',
    },
    trackButton: {
        marginTop: 16,
        borderRadius: 16,
        minHeight: 56,
        borderWidth: 1,
        borderColor: '#F7C98F',
        backgroundColor: '#FFF8F0',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 18,
    },
    trackButtonText: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: Colors.brandOrange,
    },
    trackPanelWrap: {
        marginTop: 16,
    }
});
