import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

const PageLoading = ({ size = 48, color = '#F59E0B', fullScreen = false, backgroundColor = 'rgba(255,255,255,0.7)' }) => {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const createAnimation = () => {
      return Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 900,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.5,
            duration: 900,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 900,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 900,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ]);
    };

    const animation = Animated.loop(createAnimation());
    animation.start();

    return () => animation.stop();
  }, [scale, opacity]);

  const content = (
    <View style={[styles.container, !fullScreen && { padding: 20 }]}>
      <Animated.View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
            // Create a blur-like effect with a subtle shadow
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 15,
            elevation: 8,
          },
        ]}
      />
      {/* Secondary outer ring for the "blur" feel */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: (size * 1.6) / 2,
            borderColor: color,
            borderWidth: 3,
            opacity: opacity.interpolate({
              inputRange: [0.4, 1],
              outputRange: [0.1, 0.5],
            }),
            transform: [{
              scale: scale.interpolate({
                inputRange: [0.5, 1.2],
                outputRange: [1, 1.5]
              })
            }],
          },
        ]}
      />
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenOverlay, { backgroundColor }]}>
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  fullScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
  },
});

export default PageLoading;
