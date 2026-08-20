import React, { useState } from 'react';
import { Animated } from 'react-native';
import BootSplash from 'react-native-bootsplash';

type Props = {
  onAnimationEnd: () => void;
};

export const AnimatedSplash = ({ onAnimationEnd }: Props) => {
  const [opacity] = useState(() => new Animated.Value(1));

  const { container, logo } = BootSplash.useHideAnimation({
    manifest: require('./src/shared/bootsplash/manifest.json'),
    logo: require('./src/shared/bootsplash/logo.png'),
    statusBarTranslucent: true,
    navigationBarTranslucent: false,
    animate: () => {
      Animated.sequence([
        // Optional: keep a small delay before fading out so the splash screen is visible
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

  return (
    <Animated.View {...container} style={[container.style, { opacity }]}>
      <Animated.Image {...logo} style={logo.style} />
    </Animated.View>
  );
};