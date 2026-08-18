import React, { useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import BootSplash from 'react-native-bootsplash';

type Props = {
  onAnimationEnd: () => void;
};

export const AnimatedSplash = ({ onAnimationEnd }: Props) => {
  const [opacity] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(1));
  const [textOpacity] = useState(() => new Animated.Value(0));

  const { container, logo } = BootSplash.useHideAnimation({
    manifest: require('./src/shared/bootsplash/manifest.json'),
    logo: require('./src/shared/bootsplash/logo.png'),
    statusBarTranslucent: true,
    navigationBarTranslucent: false,
    animate: () => {
      Animated.sequence([
        Animated.timing(scale, {
          useNativeDriver: true,
          toValue: 2.5,
          duration: 400,
        }),
        Animated.timing(textOpacity, {
          useNativeDriver: true,
          toValue: 1,
          duration: 300,
        }),
        Animated.delay(300),
        Animated.timing(opacity, {
          useNativeDriver: true,
          toValue: 0,
          duration: 400,
        }),
      ]).start(() => {
        onAnimationEnd();
      });
    },
  });

  // logo.style carries absolute top/left/width/height computed by BootSplash.
  // Compute the text's position from the logo's own bottom edge.
  const logoTop = typeof logo.style?.top === 'number' ? logo.style.top : 0;
  const logoHeight = typeof logo.style?.height === 'number' ? logo.style.height : 0;
  const logoLeft = typeof logo.style?.left === 'number' ? logo.style.left : 0;
  const logoWidth = typeof logo.style?.width === 'number' ? logo.style.width : 0;

  return (
    <Animated.View {...container} style={[container.style, { opacity }]}>
      <Animated.Image
        {...logo}
        style={[logo.style, { transform: [{ scale }] }]}
      />
      <Animated.Text
        style={[
          styles.brandText,
          {
            opacity: textOpacity,
            position: 'absolute',
            top: logoTop + logoHeight + 20, // 20px gap below logo
            left: 0,
            right: 0,
            textAlign: 'center',
          },
        ]}
      >
        StreakSphere
      </Animated.Text>
    </Animated.View>
  );
};
 
const styles = StyleSheet.create({
  brandText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});