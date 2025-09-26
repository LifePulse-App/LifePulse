// src/components/IdleHandler.tsx
import React from 'react';
import { View, TouchableWithoutFeedback } from 'react-native';
import useIdleTimer from './IdleTimer';
import { useNavigation } from '@react-navigation/native';
import { useContext } from 'react';
import AuthContext from '../../auth/user/UserContext';

interface Props {
  children: React.ReactNode;
}

const IdleHandler = ({ children }: Props) => {
  const navigation = useNavigation();
  const { setUser } = useContext(AuthContext);

  const handleIdle = () => {
    console.log('User idle. Logging out...');
    setUser?.(undefined);
    navigation.reset({
      index: 0,
      routes: [{ name: 'LoginScreen' }],
    });
  };

  useIdleTimer(handleIdle, 5 * 60 * 1000); // 5 minutes

  return (
    <TouchableWithoutFeedback onPress={() => {}}>
      <View style={{ flex: 1 }}>{children}</View>
    </TouchableWithoutFeedback>
  );
};

export default IdleHandler;
