import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Image,
    Alert,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import SignatureCanvas from 'react-native-signature-canvas';
import { Colors, Fonts, Shadows } from '../theme/ui';
import PageLoading from '../components/PageLoading';
import ScreenWrapper from '../components/ScreenWrapper';

/** Normalize canvas output to raw base64 (no data URL prefix). */
function toRawBase64(data) {
    if (!data) return '';
    const s = String(data).trim();
    const m = /^data:image\/\w+;base64,(.+)$/i.exec(s);
    return m ? m[1] : s;
}

export default function ProofOfDeliveryScreen({ route, navigation }) {
    const { tripId, trip } = route.params || {};
    const jobDisplayId = trip?.primaryJob?.jobId || tripId;

    const isFocused = useIsFocused();
    const cameraRef = useRef(null);
    const signatureRef = useRef(null);
    const [permission, requestPermission] = useCameraPermissions();

    const [photoBase64, setPhotoBase64] = useState(null);
    const [photoPreviewUri, setPhotoPreviewUri] = useState(null);
    const [signatureRaw, setSignatureRaw] = useState(null);
    const [signatureSaved, setSignatureSaved] = useState(false);
    const [capturing, setCapturing] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);
    const [scrollEnabled, setScrollEnabled] = useState(true);

    useEffect(() => {
        if (!isFocused) setCameraReady(false);
    }, [isFocused]);

    const handleCapturePhoto = async () => {
        if (!cameraRef.current) {
            Alert.alert('Camera', 'Camera is not ready. Try again.');
            return;
        }
        setCapturing(true);
        try {
            const result = await cameraRef.current.takePictureAsync({
                quality: 0.75,
                base64: false,
            });
            if (!result?.uri) {
                throw new Error('No image returned');
            }
            const manipulated = await ImageManipulator.manipulateAsync(
                result.uri,
                [{ resize: { width: 1280 } }],
                {
                    compress: 0.72,
                    format: ImageManipulator.SaveFormat.JPEG,
                    base64: true,
                }
            );
            setPhotoPreviewUri(manipulated.uri);
            setPhotoBase64(manipulated.base64 || null);
        } catch (e) {
            console.error(e);
            Alert.alert('Camera', e.message || 'Could not capture photo.');
        } finally {
            setCapturing(false);
        }
    };

    const clearPhoto = () => {
        setPhotoBase64(null);
        setPhotoPreviewUri(null);
        setCameraReady(false);
    };

    const confirmRemovePhoto = () => {
        Alert.alert('Remove photo?', 'You can capture a new photo afterwards.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: clearPhoto },
        ]);
    };

    const onSignatureOK = (sig) => {
        const raw = toRawBase64(sig);
        const valid = Boolean(raw && raw.length > 32);
        setSignatureRaw(valid ? raw : null);
        setSignatureSaved(valid);
    };

    const clearSignature = () => {
        signatureRef.current?.clearSignature?.();
        setSignatureRaw(null);
        setSignatureSaved(false);
    };

    const handleContinue = useCallback(() => {
        if (!photoBase64 || !signatureRaw) {
            Alert.alert(
                'Proof of delivery',
                'Please capture a delivery photo and capture the customer signature.'
            );
            return;
        }
        navigation.navigate('CompleteTrip', {
            tripId,
            trip,
            proofOfDelivery: {
                deliveryPhotoBase64: photoBase64,
                customerSignatureBase64: signatureRaw,
            },
        });
    }, [navigation, tripId, trip, photoBase64, signatureRaw]);

    const canContinue = Boolean(photoBase64 && signatureSaved && signatureRaw);

    if (!tripId || !trip) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.missing}>Missing trip. Go back and open the trip again.</Text>
            </View>
        );
    }

    if (!permission) {
        return (
            <View style={[styles.container, styles.centered]}>
                <PageLoading />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.centered, { padding: 24 }]}>
                <Text style={styles.permText}>Camera access is needed for proof of delivery.</Text>
                <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
                    <Text style={styles.btnPrimaryText}>Allow camera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={scrollEnabled}
                nestedScrollEnabled
            >
                <View style={styles.headerBox}>
                    <Text style={styles.tripId}>Job ID: {jobDisplayId}</Text>
                    <Text style={styles.sub}>
                        Capture proof first, then you will enter final odometer and fuel on the next screen. You can
                        change or remove the photo before continuing.
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>Delivery photo</Text>
                <Text style={styles.hint}>Use a live photo of the delivered goods or drop-off location.</Text>

                {!photoPreviewUri ? (
                    <View style={styles.cameraWrap}>
                        {isFocused ? (
                            <CameraView
                                ref={cameraRef}
                                style={styles.camera}
                                facing="back"
                                active={isFocused}
                                onCameraReady={() => setCameraReady(true)}
                            />
                        ) : (
                            <View style={[styles.camera, styles.cameraPlaceholder]}>
                                <Text style={styles.placeholderText}>Open this screen to use the camera</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.shutter, capturing && styles.shutterDisabled]}
                            onPress={handleCapturePhoto}
                            disabled={capturing || !isFocused || !cameraReady}
                        >
                            {capturing ? (
                                <PageLoading size={24} color="#fff" />
                            ) : (
                                <Text style={styles.shutterText}>
                                    {cameraReady ? 'Capture photo' : 'Preparing camera…'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.previewBox}>
                        <Image source={{ uri: photoPreviewUri }} style={styles.previewImg} resizeMode="cover" />
                        <View style={styles.previewActions}>
                            <TouchableOpacity style={[styles.previewBtn, styles.previewBtnLeft]} onPress={clearPhoto}>
                                <Text style={styles.previewBtnTextPrimary}>Change photo</Text>
                                <Text style={styles.previewBtnHint}>Take a new picture</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.previewBtn} onPress={confirmRemovePhoto}>
                                <Text style={styles.previewBtnTextDanger}>Remove photo</Text>
                                <Text style={styles.previewBtnHint}>Delete and capture again</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Customer signature</Text>
                <Text style={styles.hint}>Ask the customer to sign in the box, then tap &quot;Save signature&quot; on the pad.</Text>

                <View style={styles.sigWrap}>
                    <SignatureCanvas
                        ref={signatureRef}
                        nestedScrollEnabled
                        descriptionText="Sign above"
                        onOK={onSignatureOK}
                        // Keep proof required, but avoid transient empty callbacks disabling the CTA unexpectedly.
                        onEmpty={() => {
                            if (!signatureSaved) setSignatureRaw(null);
                        }}
                        onBegin={() => setScrollEnabled(false)}
                        onEnd={() => {
                            setScrollEnabled(true);
                            signatureRef.current?.readSignature?.();
                        }}
                        confirmText="Save signature"
                        clearText="Clear"
                        penColor="#111827"
                        backgroundColor="#FFFFFF"
                        webStyle={`
                .m-signature-pad { box-shadow: none; margin: 0; border: 1px solid #D1D5DB; border-radius: 10px; }
                .m-signature-pad--body { border: none; }
                .m-signature-pad--footer { display: flex; flex-direction: row; justify-content: space-between; padding: 8px; }
                body,html { height: 100%; margin: 0; }
              `}
                        style={styles.sigCanvas}
                    />
                </View>

                {signatureRaw ? (
                    <TouchableOpacity style={styles.clearSigOuter} onPress={clearSignature}>
                        <Text style={styles.clearSigText}>Clear and re-sign</Text>
                    </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                    style={[styles.btnPrimary, styles.continueBtn, !canContinue && styles.btnDisabled]}
                    onPress={handleContinue}
                    disabled={!canContinue}
                >
                    <Text style={styles.btnPrimaryText}>Continue to trip inputs</Text>
                </TouchableOpacity>
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
        padding: 20,
        paddingBottom: 40,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    missing: {
        fontSize: 15,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        textAlign: 'center',
    },
    headerBox: {
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderLeftWidth: 5,
        borderLeftColor: Colors.brandOrange,
        ...Shadows.card,
    },
    tripId: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#111827',
        marginBottom: 8,
    },
    sub: {
        fontSize: 14,
        color: '#4B5563',
        fontFamily: Fonts.regular,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#1A1D26',
        marginBottom: 6,
    },
    hint: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        marginBottom: 12,
    },
    cameraWrap: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    camera: {
        width: '100%',
        height: 220,
    },
    cameraPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1F2937',
    },
    placeholderText: {
        color: Colors.textTertiary,
        fontFamily: Fonts.regular,
        paddingHorizontal: 16,
        textAlign: 'center',
    },
    shutter: {
        backgroundColor: Colors.brandOrange,
        paddingVertical: 14,
        alignItems: 'center',
    },
    shutterDisabled: {
        opacity: 0.7,
    },
    shutterText: {
        color: '#fff',
        fontFamily: Fonts.bold,
        fontSize: 16,
    },
    previewBox: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    previewImg: {
        width: '100%',
        height: 220,
        backgroundColor: '#F3F4F6',
    },
    previewActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    previewBtn: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    previewBtnLeft: {
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
    },
    previewBtnTextPrimary: {
        color: '#2563EB',
        fontFamily: Fonts.bold,
        fontSize: 15,
    },
    previewBtnTextDanger: {
        color: '#DC2626',
        fontFamily: Fonts.bold,
        fontSize: 15,
    },
    previewBtnHint: {
        fontSize: 11,
        color: Colors.textSecondary,
        fontFamily: Fonts.regular,
        marginTop: 2,
        textAlign: 'center',
    },
    sigWrap: {
        height: 260,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    sigCanvas: {
        flex: 1,
    },
    clearSigOuter: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    clearSigText: {
        color: '#DC2626',
        fontFamily: Fonts.medium,
        fontSize: 14,
    },
    btnPrimary: {
        backgroundColor: Colors.brandOrange,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        ...Shadows.card,
    },
    continueBtn: {
        marginTop: 24,
    },
    btnDisabled: {
        backgroundColor: '#9CA3AF',
    },
    btnPrimaryText: {
        color: Colors.surface,
        fontFamily: Fonts.bold,
        fontSize: 16,
    },
    permText: {
        fontSize: 16,
        color: '#374151',
        fontFamily: Fonts.regular,
        textAlign: 'center',
        marginBottom: 16,
    },
});
