// src/services/IdleServiceProvider.tsx
import React, { useContext, useState } from 'react';
import { View } from 'react-native';
import InactivityAlert from './InactivityLogoutScreen'; // Your modal
import { useIdleService } from './IdleService'; // Your current hook
import AuthContext from '../../auth/user/UserContext'; // Use your real auth provider

export const IdleServiceProvider = ({ children }: { children: React.ReactNode }) => {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const authContext = useContext(AuthContext);

  const { Token, refreshToken, logout } = authContext?.User; // Replace with your real logic

  useIdleService({
    getToken: () => Token,
    refreshToken: async () => {
      await refreshToken();
    },
    logout: async () => {
      await logout();
    },
    showAlert: (cd, onStay) => {
      setCountdown(cd);
      setShowModal(true);
    },
    dismissAlert: () => {
      setShowModal(false);
    },
  });

  return (
    <View style={{ flex: 1 }}>
      {children}
      <InactivityAlert visible={showModal} countdown={countdown} onStay={() => setShowModal(false)} />
    </View>
  );
};
