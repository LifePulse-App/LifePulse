// components/MainLayout.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import LowNavBar from './LowNavBar'; // Fixed import path
import { SafeAreaView } from 'react-native-safe-area-context';

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.content}>{children}</View>
    <LowNavBar />
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  content: {
    flex: 11,
  },
});

export default MainLayout;
