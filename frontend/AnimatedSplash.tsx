import React, { useState, useEffect } from 'react';
import { Animated } from 'react-native';
import BootSplash from 'react-native-bootsplash';

type Props = {
  onAnimationEnd: () => void;
};

export const AnimatedSplash = ({ onAnimationEnd }: Props) => {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 🛡️ FAIL-SAFE TIMER: Force-hide splash if BootSplash native hook hangs after CodePush
    const safetyTimer = setTimeout(() => {
      onAnimationEnd();
    }, 1500);

    return () => clearTimeout(safetyTimer);
  }, [onAnimationEnd]);

  const { container, logo } = BootSplash.useHideAnimation({
    manifest: require('./src/shared/bootsplash/manifest.json'),
    logo: require('./src/shared/bootsplash/logo.png'),
    statusBarTranslucent: true,
    navigationBarTranslucent: false,
    animate: () => {
      Animated.sequence([
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