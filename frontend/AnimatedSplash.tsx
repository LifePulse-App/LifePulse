// AnimatedSplash.tsx — simplified, no duplicate logo render
import { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';

export const hideSplash = async () => {
  try {
    await BootSplash.hide({ fade: true });
  } catch (e) {
    console.log('BootSplash hide failed', e);
  }
};