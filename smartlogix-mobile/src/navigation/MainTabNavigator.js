import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { Colors, Fonts } from '../theme/ui';

import TripsScreen from '../screens/TripsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Activity') {
                        iconName = focused ? 'receipt' : 'receipt-outline';
                    } else if (route.name === 'Notifications') {
                        iconName = focused ? 'notifications' : 'notifications-outline';
                    } else if (route.name === 'Account') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textTertiary,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: Colors.border,
                    paddingBottom: 24, // Increased to provide Safe Area for iOS Home Indicator
                    paddingTop: 8,
                    height: 80, // Increased to accommodate the padding
                },
                tabBarLabelStyle: {
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                },
                headerStyle: {
                    backgroundColor: Colors.surface,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 3,
                },
                headerLeft: () => (
                    <Image
                        source={require('../../assets/images/SmartLogixLOGO.png')}
                        style={{ width: 140, height: 35, marginLeft: 20 }}
                        resizeMode="contain"
                    />
                ),
                headerTitle: '', // Hide standard text title in favor of the logo
                headerTintColor: Colors.textPrimary,
            })}
        >
            <Tab.Screen
                name="Home"
                component={TripsScreen}
                options={{ title: 'Trips' }}
            />
            <Tab.Screen
                name="Activity"
                component={ActivityScreen}
                options={{ title: 'Activity' }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ title: 'Notifications' }}
            />
            <Tab.Screen
                name="Account"
                component={AccountScreen}
                options={{ title: 'Account' }}
            />
        </Tab.Navigator>
    );
}
