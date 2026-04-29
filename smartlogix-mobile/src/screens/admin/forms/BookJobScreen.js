import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import ScreenWrapper from '../../../components/ScreenWrapper';
import { Colors } from '../../../theme/ui';
import PageLoading from '../../../components/PageLoading';
import { jobAPI } from '../../../services/api';

import CargoDetailsStep from '../steps/CargoDetailsStep';
import PickupLocationStep from '../steps/PickupLocationStep';
import DeliveryLocationStep from '../steps/DeliveryLocationStep';
import CustomerDetailsStep from '../steps/CustomerDetailsStep';
import PricingStep from '../steps/PricingStep';
import VehicleSelectionStep from '../steps/VehicleSelectionStep';
import DriverSelectionStep from '../steps/DriverSelectionStep';
import BackhaulSelectionSheet from '../modals/BackhaulSelectionSheet';
import BookingSuccessModal from '../modals/BookingSuccessModal';
import { BOOK_JOB_STEPS } from './bookJob.constants';
import { createInitialFormData } from './bookJob.initialState';
import { isWithinSriLankaBounds, validateBookingTimeline, validateCustomerDetails } from './bookJob.validators';
import { buildVehicleMatchPayload, buildBookJobPayload } from './bookJob.payloads';
import { styles } from './bookJob.styles';

const isVehicleNonCompliant = (vehicle, thresholdDays = 3) => {
    const status = String(vehicle?.status || '').toLowerCase();
    if (status === 'out of service' || status === 'out-of-service' || status === 'offline') return true;

    const now = new Date();
    const toDays = (d) => {
        if (!d) return null;
        const dt = new Date(d);
        if (Number.isNaN(dt.getTime())) return null;
        return Math.ceil((dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };
    const lic = toDays(vehicle?.licenseEndDate);
    const ins = toDays(vehicle?.insuranceEndDate);
    const licRisk = typeof lic === 'number' && lic <= thresholdDays;
    const insRisk = typeof ins === 'number' && ins <= thresholdDays;
    return licRisk || insRisk;
};

export default function BookJobScreen() {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState(createInitialFormData());

    // Selection states
    const [showBackhaulSelection, setShowBackhaulSelection] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [suggestedVehicles, setSuggestedVehicles] = useState([]);
    const [availableDrivers, setAvailableDrivers] = useState([]);
    const [backhaulOpportunities, setBackhaulOpportunities] = useState([]);
    const [bookingResult, setBookingResult] = useState(null);

    const getMainStep = () => {
        if (currentStep <= 5) return 1;
        if (currentStep === 6) return 2;
        return 3;
    };

    const mainStep = getMainStep();
    const getMainStepFill = (stepId) => {
        if (stepId < mainStep) return 100;
        if (stepId > mainStep) return 0;
        if (stepId === 1) return (currentStep / 5) * 100;
        return 100;
    };

    const getMainStepTintColor = (stepId) => (stepId < mainStep ? Colors.success : Colors.brandOrange);

    const getStepValidationError = (step) => {
        if (step === 1) {
            if (!formData.cargo.weight || Number(formData.cargo.weight) <= 0) {
                return 'Please enter a valid cargo weight.';
            }
            if (!formData.cargo.volume || Number(formData.cargo.volume) <= 0) {
                return 'Please enter a valid cargo volume.';
            }
            if (!formData.cargo.description?.trim()) {
                return 'Please enter a cargo description.';
            }
            return null;
        }

        if (step === 2) {
            if (!formData.pickup.address?.trim()) {
                return 'Please enter pickup address.';
            }
            if (!formData.pickup.datetime) {
                return 'Please select pickup date and time.';
            }
            if (!isWithinSriLankaBounds(formData.pickup.coordinates)) {
                return 'Pickup location must be within Sri Lanka.';
            }
            return null;
        }

        if (step === 3) {
            if (!formData.delivery.address?.trim()) {
                return 'Please enter delivery address.';
            }
            if (!formData.delivery.datetime) {
                return 'Please select delivery date and time.';
            }
            if (!isWithinSriLankaBounds(formData.delivery.coordinates)) {
                return 'Delivery location must be within Sri Lanka.';
            }
            const timelineValidation = validateBookingTimeline(formData.pickup.datetime, formData.delivery.datetime);
            if (timelineValidation.error) {
                return timelineValidation.error;
            }
            return null;
        }

        if (step === 4) {
            if (!formData.customer.name?.trim()) {
                return 'Please enter customer name.';
            }
            const customerError = validateCustomerDetails(formData.customer);
            if (customerError) {
                return customerError;
            }
            return null;
        }

        if (step === 5) {
            if (!formData.pricing.quotedPrice || Number(formData.pricing.quotedPrice) <= 0) {
                return 'Please enter a valid quoted price.';
            }
            return null;
        }

        return null;
    };

    const isStepValid = () => {
        if (currentStep === 1) {
            return formData.cargo.weight && formData.cargo.volume && formData.cargo.description;
        }
        if (currentStep === 2) {
            return formData.pickup.address && formData.pickup.datetime && formData.pickup.coordinates;
        }
        if (currentStep === 3) {
            return formData.delivery.address && formData.delivery.datetime && formData.delivery.coordinates;
        }
        if (currentStep === 4) {
            return formData.customer.name && formData.customer.phone;
        }
        if (currentStep === 5) {
            return formData.pricing.quotedPrice;
        }
        if (currentStep === 6) {
            return formData.selectedVehicleId;
        }
        if (currentStep === 7) {
            return formData.selectedDriverId;
        }
        return false;
    };

    const handleStepChange = (newStep) => {
        if (newStep > currentStep) {
            const stepError = getStepValidationError(currentStep);
            if (stepError) {
                Alert.alert('Validation', stepError);
                return;
            }
        }

        if (newStep > currentStep && !isStepValid()) {
            Alert.alert('Incomplete', 'Please complete this step to continue.');
            return;
        }
        setCurrentStep(newStep);
        setError('');
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: typeof prev[field] === 'object' ? { ...prev[field], ...value } : value
        }));
        setError('');
    };

    const handleLoadVehicles = async () => {
        setLoading(true);
        setError('');
        try {
            for (let step = 1; step <= 5; step += 1) {
                const stepError = getStepValidationError(step);
                if (stepError) {
                    throw new Error(stepError);
                }
            }

            const timelineValidation = validateBookingTimeline(formData.pickup.datetime, formData.delivery.datetime);
            if (timelineValidation.error) {
                throw new Error(timelineValidation.error);
            }

            if (!isWithinSriLankaBounds(formData.pickup.coordinates)) {
                throw new Error('Pickup location must be within Sri Lanka.');
            }
            if (!isWithinSriLankaBounds(formData.delivery.coordinates)) {
                throw new Error('Delivery location must be within Sri Lanka.');
            }

            const customerError = validateCustomerDetails(formData.customer);
            if (customerError) {
                throw new Error(customerError);
            }

            const { pickupDate, deliveryDate } = timelineValidation;
            const matchPayload = buildVehicleMatchPayload({ formData, pickupDate, deliveryDate });

            const matchResponse = await jobAPI.matchVehicles(matchPayload);
            if (matchResponse.data.success && matchResponse.data.allMatches.length > 0) {
                const safeMatches = (matchResponse.data.allMatches || []).filter((v) => !isVehicleNonCompliant(v));
                setSuggestedVehicles(safeMatches);
                handleStepChange(6);
            } else {
                setError('No suitable vehicles found for this job.');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to match vehicles.');
        } finally {
            setLoading(false);
        }
    };

    const handleVehicleSelect = async (vehicleId) => {
        setFormData(prev => ({ ...prev, selectedVehicleId: vehicleId }));
        setLoading(true);
        try {
            const pickupDate = new Date(formData.pickup.datetime);
            const deliveryDate = new Date(formData.delivery.datetime);
            const response = await jobAPI.getAvailableDrivers({
                pickupDatetime: pickupDate.toISOString(),
                deliveryDatetime: deliveryDate.toISOString()
            });
            setAvailableDrivers((response.data.drivers || []).filter((driver) => !driver.isAdmin));
            handleStepChange(7);
        } catch (err) {
            setError('Failed to load available drivers.');
        } finally {
            setLoading(false);
        }
    };

    const handleDriverSelect = async (driverId) => {
        setFormData(prev => ({ ...prev, selectedDriverId: driverId }));
        setLoading(true);
        try {
            const response = await jobAPI.getBackhauls({
                lng: formData.delivery.coordinates[0],
                lat: formData.delivery.coordinates[1],
                vehicleId: formData.selectedVehicleId,
                radius: 20
            });
            setBackhaulOpportunities(response.data.opportunities || []);
            setShowBackhaulSelection(true);
        } catch (err) {
            handleBackhaulSelect('skip');
        } finally {
            setLoading(false);
        }
    };

    const handleBackhaulSelect = async (selectedBackhaulId) => {
        setShowBackhaulSelection(false);
        setLoading(true);
        try {
            const timelineValidation = validateBookingTimeline(formData.pickup.datetime, formData.delivery.datetime);
            if (timelineValidation.error) {
                throw new Error(timelineValidation.error);
            }
            const { pickupDate, deliveryDate } = timelineValidation;

            const payload = buildBookJobPayload({
                formData,
                pickupDate,
                deliveryDate,
                selectedBackhaulId
            });

            const response = await jobAPI.bookJob(payload);
            setBookingResult(response.data.data);
            setShowSuccess(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to book job.');
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        setCurrentStep(1);
        setFormData(createInitialFormData());
    };

    if (loading && showSuccess === false) {
        return <PageLoading fullScreen />;
    }

    return (
        <ScreenWrapper>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
                keyboardVerticalOffset={60}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Book a Job</Text>
                        <Text style={styles.subtitle}>
                            Main Step {mainStep} of 3
                            {mainStep === 1 ? ` • Details ${currentStep} of 5` : ''}
                        </Text>
                    </View>

                    {/* Circular Progress + Step Pills */}
                    <View style={styles.stepIndicatorContainer}>
                        <View style={styles.mainStepCirclesRow}>
                            {BOOK_JOB_STEPS.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <TouchableOpacity
                                        style={styles.mainStepCircleWrap}
                                        onPress={() => {
                                            if (step.id === 1) {
                                                handleStepChange(Math.min(currentStep, 5));
                                            } else if (step.id === 2) {
                                                handleStepChange(6);
                                            } else {
                                                handleStepChange(7);
                                            }
                                        }}
                                        disabled={step.id > mainStep}
                                    >
                                        <AnimatedCircularProgress
                                            size={62}
                                            width={4}
                                            fill={getMainStepFill(step.id)}
                                            tintColor={getMainStepTintColor(step.id)}
                                            backgroundColor="#E5E7EB"
                                            rotation={0}
                                            lineCap="round"
                                        >
                                            {() => (
                                                <View style={styles.circularProgressInner}>
                                                    <Text style={styles.circularProgressStep}>
                                                        {step.id === 1 && mainStep === 1 ? currentStep : step.id}
                                                    </Text>
                                                </View>
                                            )}
                                        </AnimatedCircularProgress>
                                        <Text
                                            style={[
                                                styles.mainStepCircleLabel,
                                                step.id === mainStep && styles.mainStepCircleLabelActive
                                            ]}
                                        >
                                            {step.title}
                                        </Text>
                                    </TouchableOpacity>

                                    {index < BOOK_JOB_STEPS.length - 1 ? (
                                        <View
                                            style={[
                                                styles.mainStepConnectorDashed,
                                                step.id < mainStep && styles.mainStepConnectorCompleted
                                            ]}
                                        />
                                    ) : null}
                                </React.Fragment>
                            ))}
                        </View>
                    </View>

                    {/* Error */}
                    {error ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Step Content */}
                    <View style={styles.stepContent}>
                        {currentStep === 1 && <CargoDetailsStep data={formData.cargo} onChange={(value) => handleFormChange('cargo', value)} />}
                        {currentStep === 2 && <PickupLocationStep data={formData.pickup} onChange={(value) => handleFormChange('pickup', value)} />}
                        {currentStep === 3 && <DeliveryLocationStep data={formData.delivery} onChange={(value) => handleFormChange('delivery', value)} />}
                        {currentStep === 4 && <CustomerDetailsStep data={formData.customer} onChange={(value) => handleFormChange('customer', value)} />}
                        {currentStep === 5 && <PricingStep data={formData.pricing} onChange={(value) => handleFormChange('pricing', value)} />}
                        {currentStep === 6 && <VehicleSelectionStep vehicles={suggestedVehicles} selectedId={formData.selectedVehicleId} onSelect={handleVehicleSelect} />}
                        {currentStep === 7 && <DriverSelectionStep drivers={availableDrivers} selectedId={formData.selectedDriverId} onSelect={handleDriverSelect} />}
                    </View>

                    {/* Navigation */}
                    <View style={[styles.navigationBox, currentStep === 1 && { justifyContent: 'flex-end' }]}>
                        {currentStep > 1 && (
                            <TouchableOpacity
                                style={styles.prevButton}
                                onPress={() => handleStepChange(currentStep - 1)}
                            >
                                <Ionicons name="chevron-back" size={20} color={Colors.brandOrange} />
                                <Text style={styles.prevButtonText}>Back</Text>
                            </TouchableOpacity>
                        )}

                        {currentStep < 5 ? (
                            <TouchableOpacity
                                style={[styles.nextButton, !isStepValid() && styles.buttonDisabled]}
                                onPress={() => handleStepChange(currentStep + 1)}
                                disabled={!isStepValid()}
                            >
                                <Text style={styles.nextButtonText}>Next</Text>
                                <Ionicons name="chevron-forward" size={20} color="#fff" />
                            </TouchableOpacity>
                        ) : currentStep === 5 ? (
                            <TouchableOpacity
                                style={[styles.submitButton, loading && styles.buttonDisabled]}
                                onPress={handleLoadVehicles}
                                disabled={loading}
                            >
                                <Text style={styles.submitButtonText}>{loading ? 'Finding...' : 'Find Vehicles'}</Text>
                            </TouchableOpacity>
                        ) : currentStep === 6 ? (
                            <TouchableOpacity
                                style={[styles.nextButton, !isStepValid() && styles.buttonDisabled]}
                                onPress={() => handleStepChange(currentStep + 1)}
                                disabled={!isStepValid()}
                            >
                                <Text style={styles.nextButtonText}>Select Drivers</Text>
                                <Ionicons name="chevron-forward" size={20} color="#fff" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={[styles.submitButton, loading && styles.buttonDisabled]}
                                onPress={() => handleDriverSelect(formData.selectedDriverId)}
                                disabled={loading || !isStepValid()}
                            >
                                <Text style={styles.submitButtonText}>{loading ? 'Booking...' : 'Complete Booking'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.spacer} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modals */}
            <BackhaulSelectionSheet
                isOpen={showBackhaulSelection}
                backhauls={backhaulOpportunities}
                onSelect={handleBackhaulSelect}
                onClose={() => setShowBackhaulSelection(false)}
                loading={loading}
            />
            <BookingSuccessModal
                isOpen={showSuccess}
                data={bookingResult}
                onClose={handleSuccessClose}
            />
        </ScreenWrapper>
    );
}

