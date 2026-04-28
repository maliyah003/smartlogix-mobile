import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Fonts } from '../theme/ui';

import VehicleManagerModuleScreen from '../screens/admin/modules/VehicleManagerModuleScreen';
import DriverMonitorModuleScreen from '../screens/admin/modules/DriverMonitorModuleScreen';
import EconomicsModuleScreen from '../screens/admin/modules/EconomicsModuleScreen';
import FuelConsistencyModuleScreen from '../screens/admin/modules/FuelConsistencyModuleScreen';
import ProofOfDeliveryModuleScreen from '../screens/admin/modules/ProofOfDeliveryModuleScreen';
import TripsModuleScreen from '../screens/admin/modules/TripsModuleScreen';
import TripRefusalsModuleScreen from '../screens/admin/modules/TripRefusalsModuleScreen';
import DriverIncidentsModuleScreen from '../screens/admin/modules/DriverIncidentsModuleScreen';


const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
            <View style={styles.drawerHeader}>
                <Image
                    source={require('../../assets/images/SmartLogixLOGO.png')}
                    style={styles.drawerLogo}
                    resizeMode="contain"
                />
            </View>
            <View style={{ flex: 1, paddingTop: 10 }}>
                <DrawerItemList {...props} />
            </View>
        </DrawerContentScrollView>
    );
};

export default function AdminDrawerNavigator() {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
                drawerActiveBackgroundColor: Colors.bg, // using Colors.bg for light gray highlight
                drawerActiveTintColor: '#000000', // Solid black for active
                drawerInactiveTintColor: Colors.textSecondary,
                drawerLabelStyle: {
                    fontFamily: Fonts.medium,
                    fontSize: 15,
                    marginLeft: 0,
                },
                drawerStyle: {
                    backgroundColor: '#FFFFFF',
                    width: 280,
                },
                drawerItemStyle: {
                    borderRadius: 12,
                    marginHorizontal: 12,
                    marginVertical: 4,
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
                    <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={{ marginLeft: 20 }}>
                        <Ionicons name="menu" size={28} color={Colors.textPrimary} />
                    </TouchableOpacity>
                ),
                headerTitle: () => (
                    <Image
                        source={require('../../assets/images/SmartLogixLOGO.png')}
                        style={{ width: 140, height: 35, marginLeft: 10 }}
                        resizeMode="contain"
                    />
                ),
                headerTitleAlign: 'center',
            })}
        >
            <Drawer.Screen
                name="Trips"
                component={TripsModuleScreen}
                options={{
                    drawerLabel: 'Trips',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="map-marker-path" size={size} color={color} />
                    ),
                    title: 'Trips'
                }}
            />
            <Drawer.Screen
                name="VehicleManager"
                component={VehicleManagerModuleScreen}
                options={{
                    drawerLabel: 'Vehicle Manager',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="truck-outline" size={size} color={color} />
                    ),
                    title: 'Vehicle Manager'
                }}
            />
            <Drawer.Screen
                name="DriverMonitor"
                component={DriverMonitorModuleScreen}
                options={{
                    drawerLabel: 'Driver Monitor',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="card-account-details-outline" size={size} color={color} />
                    ),
                    title: 'Driver Monitor'
                }}
            />
            <Drawer.Screen
                name="TripRefusals"
                component={TripRefusalsModuleScreen}
                options={{
                    drawerLabel: 'Trip Refusals',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-alert-outline" size={size} color={color} />
                    ),
                    title: 'Trip Refusals'
                }}
            />
            <Drawer.Screen
                name="Incidents"
                component={DriverIncidentsModuleScreen}
                options={{
                    drawerLabel: 'Incidents',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="alert-outline" size={size} color={color} />
                    ),
                    title: 'Incidents'
                }}
            />
            <Drawer.Screen
                name="Economics"
                component={EconomicsModuleScreen}
                options={{
                    drawerLabel: 'Trip Economics',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="chart-line" size={size} color={color} />
                    ),
                    title: 'Trip Economics'
                }}
            />
            <Drawer.Screen
                name="FuelConsistency"
                component={FuelConsistencyModuleScreen}
                options={{
                    drawerLabel: 'Fuel Consistency',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="fuel" size={size} color={color} />
                    ),
                    title: 'Fuel Consistency'
                }}
            />
            <Drawer.Screen
                name="ProofOfDelivery"
                component={ProofOfDeliveryModuleScreen}
                options={{
                    drawerLabel: 'Proof of Delivery',
                    drawerIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="file-check-outline" size={size} color={color} />
                    ),
                    title: 'Proof of Delivery'
                }}
            />

        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    drawerHeader: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    drawerLogo: {
        width: 160,
        height: 45,
    },
});
