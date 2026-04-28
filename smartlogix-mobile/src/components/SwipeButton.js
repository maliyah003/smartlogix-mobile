import React, { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolate,
    runOnJS
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../theme/ui';

const SLIDER_WIDTH = 280;
const BUTTON_WIDTH = 56;
const MAX_TRANSLATE = SLIDER_WIDTH - BUTTON_WIDTH - 8; // 8px padding inside slider

const SwipeButton = forwardRef(({ onSwipeComplete, title = "Slide to complete", color = "#F59E0B", arrowColor = "#F59E0B" }, ref) => {
    const translateX = useSharedValue(0);
    const hasFinished = useSharedValue(false);

    useImperativeHandle(ref, () => ({
        reset: () => {
            hasFinished.value = false;
            translateX.value = withSpring(0);
        }
    }));

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (hasFinished.value) return;

            let newValue = event.translationX;
            if (newValue < 0) newValue = 0;
            if (newValue > MAX_TRANSLATE) newValue = MAX_TRANSLATE;

            translateX.value = newValue;
        })
        .onEnd(() => {
            if (hasFinished.value) return;

            if (translateX.value > MAX_TRANSLATE - 20) {
                // Trigger completion
                translateX.value = withSpring(MAX_TRANSLATE);
                hasFinished.value = true;
                runOnJS(onSwipeComplete)();
            } else {
                // Snap back
                translateX.value = withSpring(0);
            }
        });

    const animatedStyles = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    const textStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(
                translateX.value,
                [0, MAX_TRANSLATE / 2],
                [1, 0],
                Extrapolate.CLAMP
            ),
            transform: [
                {
                    translateX: interpolate(
                        translateX.value,
                        [0, MAX_TRANSLATE],
                        [0, MAX_TRANSLATE / 4],
                        Extrapolate.CLAMP
                    )
                }
            ]
        };
    });

    return (
        <View style={[styles.container, { backgroundColor: color }]}>
            <Animated.Text style={[styles.title, textStyle]}>
                {title}
            </Animated.Text>

            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.swipeCircle, animatedStyles]}>
                    <Ionicons name="arrow-forward" size={24} color={arrowColor} />
                </Animated.View>
            </GestureDetector>
        </View>
    );
});

export default SwipeButton;

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        padding: 4,
    },
    title: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: Fonts.bold,
        letterSpacing: 0.5,
    },
    swipeCircle: {
        height: 56,
        width: 56,
        borderRadius: 28,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 2,
    }
});
