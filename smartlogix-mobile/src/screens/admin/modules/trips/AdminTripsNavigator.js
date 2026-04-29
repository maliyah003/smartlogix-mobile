import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminTripsListScreen from './AdminTripsListScreen';
import AdminTripDetailScreen from './AdminTripDetailScreen';

const Stack = createNativeStackNavigator();

export default function AdminTripsNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AdminTripsList" component={AdminTripsListScreen} />
            <Stack.Screen name="AdminTripDetail" component={AdminTripDetailScreen} />
        </Stack.Navigator>
    );
}
