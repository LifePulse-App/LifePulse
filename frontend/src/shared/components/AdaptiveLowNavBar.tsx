import React from 'react';
import { Platform } from 'react-native';

import {
  isLiquidGlassSupported,
} from '@callstack/liquid-glass';

import LowNavBAr from './LowNavBar';
import LiquidGlassLowNavBar from './LiquidGlassLowNavBar';

const AdaptiveLowNavBar = () => {
  const shouldUseLiquidGlass =
    Platform.OS === 'ios' &&
    isLiquidGlassSupported;

  if (shouldUseLiquidGlass) {
    return <LiquidGlassLowNavBar />;
  }

  return <LowNavBAr />;
};

export default AdaptiveLowNavBar;