import React from 'react';
import {ActivityIndicator, View} from 'react-native';
import styles from './AppActivityIndicatorstyles';
import AppText from '../AppText/AppText';
import colors from '../../../shared/styling/colors';
import {
  LoaderKitView,
} from 'react-native-loader-kit';


const AppActivityIndicator = ({visible}: any) => {
  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <LoaderKitView
  style={{ width: 80, height: 80 }}
  name={'BallSpinFadeLoader'}
  animationSpeedMultiplier={1.0} // speed up/slow down animation, default: 1.0, larger is faster
  color={colors.primary} // Optional: color can be: 'red', 'green',... or '#ddd', '#ffffff',...
/>
      <AppText style={styles.loadingText}>Please Wait...</AppText>
    </View>
  );
};

export default AppActivityIndicator;