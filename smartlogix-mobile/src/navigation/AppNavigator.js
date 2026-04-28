import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import AdminTabNavigator from './AdminTabNavigator';
import ActiveTripScreen from '../screens/ActiveTripScreen';
import CompleteTripScreen from '../screens/CompleteTripScreen';
import ProofOfDeliveryScreen from '../screens/ProofOfDeliveryScreen';
import ReviewTripCostScreen from '../screens/ReviewTripCostScreen';
import TripCostReportScreen from '../screens/TripCostReportScreen';
import TrackingDetailsScreen from '../screens/TrackingDetailsScreen';
import { Colors, Fonts } from '../theme/ui';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="TrackingDetails"
                    component={TrackingDetailsScreen}
                    options={{
                        title: 'Track shipment',
                        headerStyle: { backgroundColor: Colors.surface },
                        headerTintColor: Colors.textPrimary,
                        headerTitleStyle: { fontFamily: Fonts.semibold },
                        headerShadowVisible: true,
                    }}
                />
                <Stack.Screen
                    name="MainTabs"
                    component={MainTabNavigator}
                    options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen
                    name="AdminTabs"
                    component={AdminTabNavigator}
                    options={{ headerShown: false, gestureEnabled: false }}
                />

                <Stack.Screen
                    name="ActiveTrip"
                    component={ActiveTripScreen}
                    options={({ route }) => ({
                        title: route.params?.trip?.primaryJob?.jobId || route.params?.tripId || 'Active trip',
                        headerStyle: { backgroundColor: Colors.surface },
                        headerTintColor: Colors.textPrimary,
                        headerTitleStyle: { fontFamily: Fonts.semibold },
                        headerShadowVisible: true,
                    })}
                />
                <Stack.Screen
                    name="ProofOfDelivery"
                    component={ProofOfDeliveryScreen}
                    options={{
                        title: 'Proof of delivery',
                        headerStyle: { backgroundColor: Colors.surface },
                        headerTintColor: Colors.textPrimary,
                        headerTitleStyle: { fontFamily: Fonts.semibold },
                        headerShadowVisible: true,
                        headerBackTitleVisible: false,
                    }}
                />
                <Stack.Screen
                    name="CompleteTrip"
                    component={CompleteTripScreen}
                    options={{ 
                        title: 'Complete Trip - Inputs',
                        headerStyle: { backgroundColor: Colors.surface },
                        headerTintColor: Colors.textPrimary,
                        headerTitleStyle: { fontFamily: Fonts.semibold },
                        headerShadowVisible: true,
                    }}
                />
                <Stack.Screen
                    name="ReviewTripCost"
                    component={ReviewTripCostScreen}
                    options={{ 
                        title: 'Review Final Inputs',
                        headerStyle: { backgroundColor: Colors.surface },
                        headerTintColor: Colors.textPrimary,
                        headerTitleStyle: { fontFamily: Fonts.semibold },
                        headerShadowVisible: true,
                        headerBackTitleVisible: false
                    }}
                />
                <Stack.Screen
                    name="TripCostReport"
                    component={TripCostReportScreen}
                    options={{ 
                        title: 'Trip Report',
                        headerStyle: { backgroundColor: Colors.surface },
                        headerTintColor: Colors.textPrimary,
                        headerTitleStyle: { fontFamily: Fonts.semibold },
                        headerShadowVisible: true,
                        headerLeft: () => null, // Prevent going back
                        gestureEnabled: false
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
