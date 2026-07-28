// components/MainLayout.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import LowNavBAr from './LowNavBar'; 
import { SafeAreaView } from 'react-native-safe-area-context';

// Add interface for props
interface MainLayoutProps {
  children: React.ReactNode;
  hideNavBar?: boolean;
}

const MainLayout = ({ children, hideNavBar = false }: MainLayoutProps) => {
  // Checks if the device is iOS 26 or newer
  const isIOS26Plus =
    Platform.OS === 'ios' &&
    parseInt(Platform.Version, 10) >= 26;

  return (
    <SafeAreaView style={styles.container}>
      {/* Main Content Area */}
      <View style={styles.content}>
        {children}
      </View>
      
      {/* Render navigation bar only if NOT iOS 26+ AND hideNavBar is false */}
      {!isIOS26Plus && !hideNavBar && <LowNavBAr />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816'
  },
  content: {
    flex: 1, 
    backgroundColor: 'transparent'
  },
});

export default MainLayout;