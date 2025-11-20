// components/MainLayout.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import LowNavBAr from './LowNavBar'; // Fixed import path
import { SafeAreaView } from 'react-native-safe-area-context';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.content}>{children}</View>
    <LowNavBAr />
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816'
  },
  content: {
    flex: 11,
    backgroundColor: 'transparent'
  },
});

export default MainLayout;
