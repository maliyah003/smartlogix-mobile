import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
    const [fontsLoaded] = useFonts({
        'GoogleSans-Regular': require('./assets/Google_Sans/GoogleSans-Regular.ttf'),
        'GoogleSans-Medium': require('./assets/Google_Sans/GoogleSans-Medium.ttf'),
        'GoogleSans-SemiBold': require('./assets/Google_Sans/GoogleSans-SemiBold.ttf'),
        'GoogleSans-Bold': require('./assets/Google_Sans/GoogleSans-Bold.ttf'),
    });

    if (!fontsLoaded) {
        return (
            <GestureHandlerRootView style={styles.root}>
                <SafeAreaProvider>
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color="#1A1D26" />
                    </View>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={styles.root}>
            <SafeAreaProvider>
                <StatusBar style="auto" />
                <AppNavigator />
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F6FA',
    },
});
