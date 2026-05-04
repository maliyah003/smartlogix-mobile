import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors, Fonts } from '../../../../theme/ui';
import DriverMonitorScreen from './DriverMonitorScreen';
import AddDriverScreen from './AddDriverScreen';

const Stack = createNativeStackNavigator();

export default function DriverMonitorNavigator() {
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
                name="DriverMonitorHome"
                component={DriverMonitorScreen}
                options={{ title: 'Driver Monitor' }}
            />
            <Stack.Screen
                name="AddDriverScreen"
                component={AddDriverScreen}
                options={{ title: 'Add Driver' }}
            />
        </Stack.Navigator>
    );
}
