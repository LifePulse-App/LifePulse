import React, { useState } from 'react';
import { Animated } from 'react-native';
import BootSplash from 'react-native-bootsplash';

type Props = {
  onAnimationEnd: () => void;
};

export const AnimatedSplash = ({ onAnimationEnd }: Props) => {
  // 1. Set up the animation variables
  const [opacity] = useState(() => new Animated.Value(1));
  const [scale] = useState(() => new Animated.Value(1));

  // 2. Use the Bootsplash hook
  const { container, logo } = BootSplash.useHideAnimation({
    manifest: require('./src/shared/bootsplash/manifest.json'), 
    logo: require('./src/shared/bootsplash/logo.png'),         
    
    // 3. Define the animation logic
    animate: () => {
      Animated.parallel([
        Animated.timing(scale, {
          useNativeDriver: true,
          toValue: 1.5,
          duration: 500,
        }),
        Animated.timing(opacity, {
          useNativeDriver: true,
          toValue: 1,
          duration: 500,
        }),
      ]).start(() => {
        onAnimationEnd(); // Trigger callback when done
      });
    },
  });

  return (
    <Animated.View {...container} style={[container.style, { opacity }]}>
      <Animated.Image
        {...logo}
        style={[
          logo.style,
         
        ]}
      />
    </Animated.View>
  );
};