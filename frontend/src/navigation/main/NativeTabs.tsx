import React from 'react';
import { Platform } from 'react-native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';

import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import ARCameraView from '../../screens/AR-Model/components/ar_screen';
import ChatScreen from '../../screens/chat/components/ChatScreen';
import Friends from '../../screens/friends/components/Friends';

const Tab = createNativeBottomTabNavigator();

const NativeTabs = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, a }}>
      

      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          tabBarIcon: () => ({
            type: 'sfSymbol',
            name: 'house',
          }),
        }}
      />

      <Tab.Screen
        name="ArPortal"
        component={ARCameraView}
        options={{
          tabBarIcon: () => ({
            type: 'sfSymbol',
            name: 'cube',
          }),
        }}
      />

      <Tab.Screen
        name="Friends"
        component={Friends}
        options={{
          tabBarIcon: () => ({
            type: 'sfSymbol',
            name: 'person.2',
          }),
        }}
      />

      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: () => ({
            type: 'sfSymbol',
            name: 'message',
          }),
        }}
      />

    </Tab.Navigator>
  );
};

export default NativeTabs;