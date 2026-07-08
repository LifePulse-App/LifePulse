import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';

import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';

import ChatScreen from '../../screens/chat/components/Chat';
import ARCameraView from '../../screens/AR-Model/components/ar_screen';
import MoodMap from '../../screens/mood-map/components/mood-map/MoodMap';
import LeaderboardScreen from '../../screens/leaderboard/components/leaderboard/leaderboard';
import { getUnreadChatCount, subscribeUnreadChanges } from '../../screens/chat/services/ChatNotifications';

const Tab = createNativeBottomTabNavigator();

export default function AppTabs() {
const [unreadChats, setUnreadChats] = useState(getUnreadChatCount());

  useEffect(() => {
    const unsub = subscribeUnreadChanges(() => {
      setUnreadChats(getUnreadChatCount());
    });
    return () => unsub();
  }, []);
  return (
    <Tab.Navigator
    initialRouteName='Dashboard'
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
      backgroundColor: 'transparent', // or your actual brand color if you don't want true transparency
    },
    tabBarActiveIndicatorEnabled: false
      }}
    >
      <Tab.Screen
        name="Student"
        component={MoodMap}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: Platform.select({
            ios: {
              type: 'sfSymbol',
              name: 'map',
            },
            android: {
              type: 'materialSymbol',
              name: 'map',
            },
          }),
        }}
      />

      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: Platform.select({
            ios: {
              type: 'sfSymbol',
              name: 'house',
            },
            android: {
              type: 'materialSymbol',
              name: 'home',
            },
          }),
        }}
      />

      <Tab.Screen
        name="ArPortal"
        component={ARCameraView}
        options={{
          tabBarLabel: 'AR Portal',
          tabBarStyle: { display: 'none' },
          tabBarIcon: Platform.select({
            ios: {
              type: 'sfSymbol',
              name: 'cube',
            },
            android: {
              type: 'materialSymbol',
              name: 'view_in_ar',
            },
          }),
        }}
      />

      <Tab.Screen
        name="Employee"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'LeaderBoard',
          tabBarIcon: Platform.select({
            ios: {
              type: 'sfSymbol',
              name: 'chart.bar',
            },
            android: {
              type: 'materialSymbol',
              name: 'leaderboard',
            },
          }),
        }}
      />

       <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarBadge: unreadChats > 0 ? (unreadChats > 99 ? '99+' : unreadChats) : undefined,
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'message' },
            android: { type: 'materialSymbol', name: 'chat' },
          }),
        }}
      />
    </Tab.Navigator>
  );
}