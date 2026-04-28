import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { Colors, Fonts } from '../theme/ui';

import AdminDrawerNavigator from './AdminDrawerNavigator';
import JobBookingModuleScreen from '../screens/admin/modules/JobBookingModuleScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                        return <Ionicons name={iconName} size={size} color={color} />;
                    } else if (route.name === 'Book Job') {
                        return <Ionicons name={focused ? 'add-circle' : 'add-circle-outline'} size={size} color={color} />;
                    } else if (route.name === 'Notifications') {
                        iconName = focused ? 'notifications' : 'notifications-outline';
                        return <Ionicons name={iconName} size={size} color={color} />;
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                        return <Ionicons name={iconName} size={size} color={color} />;
                    }
                },
                tabBarActiveTintColor: Colors.brandOrange,
                tabBarInactiveTintColor: Colors.textTertiary,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: Colors.border,
                    paddingBottom: 24, 
                    paddingTop: 8,
                    height: 80, 
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
                headerTitle: '', 
                headerTintColor: Colors.textPrimary,
            })}
        >
            <Tab.Screen
                name="Home"
                component={AdminDrawerNavigator}
                options={{ 
                    title: 'Home',
                    headerShown: false // Hide Tab header here, so Drawer's custom header is the only one visible on this tab
                }}
            />
            <Tab.Screen
                name="Book Job"
                component={JobBookingModuleScreen}
                options={{ title: 'Book Job' }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ title: 'Notifications' }}
            />
            <Tab.Screen
                name="Profile"
                component={AccountScreen}
                options={{ title: 'Profile' }}
            />
        </Tab.Navigator>
    );
}
