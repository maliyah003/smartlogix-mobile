import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors, Fonts } from '../../../../theme/ui';
import VehicleManagerScreen from './VehicleManagerScreen';
import AddVehicleScreen from './AddVehicleScreen';

const Stack = createNativeStackNavigator();

export default function VehicleManagerNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                headerStyle: { backgroundColor: Colors.surface },
                headerTintColor: Colors.textPrimary,
                headerTitleStyle: { fontFamily: Fonts.semibold },
            }}
        >
            <Stack.Screen
                name="VehicleManagerHome"
                component={VehicleManagerScreen}
                options={{ title: 'Vehicle Manager' }}
            />
            <Stack.Screen
                name="AddVehicleScreen"
                component={AddVehicleScreen}
                options={{ title: 'Add Vehicle' }}
            />
        </Stack.Navigator>
    );
}
