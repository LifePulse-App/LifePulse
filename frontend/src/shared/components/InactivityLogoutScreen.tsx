// src/components/InactivityAlert.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, Button } from 'react-native';

const InactivityAlert = ({
  visible,
  countdown,
  onStay,
}: {
  visible: boolean;
  countdown: number;
  onStay: () => void;
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Text style={styles.header}>⚠️ Inactivity Warning</Text>
          <Text style={styles.message}>
            You’ll be logged out in {countdown} seconds due to inactivity.
          </Text>
          <Button title="Stay Logged In" onPress={onStay} />
        </View>
      </View>
    </Modal>
  );
};

export default InactivityAlert;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    elevation: 10,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
  },
});
