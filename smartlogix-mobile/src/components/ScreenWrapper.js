import React from 'react';
import { 
    StyleSheet, 
    SafeAreaView, 
    KeyboardAvoidingView, 
    Platform, 
    View 
} from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../theme/ui';

const ScreenWrapper = ({ 
    children, 
    style, 
    withKeyboard = false, 
    keyboardVerticalOffset = 0,
    backgroundColor = 'transparent'
}) => {
    const Content = (
        <View style={[styles.innerContainer, { backgroundColor }, style]}>
            {children}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* SVG Background */}
            <Image
                source={require('../../assets/images/Mobile back.svg')}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={200}
            />

            <SafeAreaView style={styles.safeArea}>
                {withKeyboard ? (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.flex}
                        keyboardVerticalOffset={keyboardVerticalOffset}
                    >
                        {Content}
                    </KeyboardAvoidingView>
                ) : (
                    Content
                )}
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Fallback
    },
    safeArea: {
        flex: 1,
    },
    innerContainer: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
});

export default ScreenWrapper;
