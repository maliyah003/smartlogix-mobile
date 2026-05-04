import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TripRefusalsScreen from './TripRefusalsScreen';
import TripRefusalAssignScreen from './TripRefusalAssignScreen';

const Stack = createNativeStackNavigator();

export default function TripRefusalsNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="TripRefusalsHome" component={TripRefusalsScreen} />
            <Stack.Screen name="TripRefusalAssign" component={TripRefusalAssignScreen} />
        </Stack.Navigator>
    );
}

