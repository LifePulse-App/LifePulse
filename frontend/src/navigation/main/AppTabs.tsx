import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useIsFocused } from '@react-navigation/native';

import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import ChatScreen from '../../screens/chat/components/Chat';
import ARCameraView from '../../screens/AR-Model/components/ar_screen';
import MoodMap from '../../screens/mood-map/components/mood-map/MoodMap';
import LeaderboardScreen from '../../screens/leaderboard/components/leaderboard/leaderboard';
import { getUnreadChatCount, subscribeUnreadChanges } from '../../screens/chat/services/ChatNotifications';

const Tab = createNativeBottomTabNavigator();

// 1. Create a Lazy Load Wrapper
// This prevents the screen from mounting its heavy logic until the tab is clicked.
// Once clicked, it stays mounted in memory so you don't lose state when switching back.
const withLazyLoad = (Component) => (props) => {
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (isFocused && !hasMounted) {
      setHasMounted(true);
    }
  }, [isFocused, hasMounted]);

  if (!hasMounted) {
    // Return a blank screen while in the background. 
    // Match this color to your app's main background color.
    return <View style={{ flex: 1, backgroundColor: '#050816' }} />;
  }

  return <Component {...props} />;
};

// 2. Wrap your heavy components
const LazyMoodMap = withLazyLoad(MoodMap);
const LazyARCameraView = withLazyLoad(ARCameraView);
const LazyDashboard = withLazyLoad(Dashboard);
const LazyLeaderboardScreen = withLazyLoad(LeaderboardScreen);
const LazyChatScreen = withLazyLoad(ChatScreen);

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
          backgroundColor: 'transparent',
        },
        tabBarActiveIndicatorEnabled: false
      }}
    >
      <Tab.Screen
        name="Student"
        component={LazyMoodMap}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'map' },
            android: { type: 'materialSymbol', name: 'map' },
          }),
        }}
      />

      <Tab.Screen
        name="Dashboard"
        component={LazyDashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'house' },
            android: { type: 'materialSymbol', name: 'home' },
          }),
        }}
      />

      <Tab.Screen
        name="ArPortal"
        component={LazyARCameraView}
        options={{
          tabBarLabel: 'AR Portal',
          tabBarStyle: { display: 'none' },
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'cube' },
            android: { type: 'materialSymbol', name: 'view_in_ar' },
          }),
        }}
      />

      <Tab.Screen
        name="Employee"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'LeaderBoard',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'chart.bar' },
            android: { type: 'materialSymbol', name: 'leaderboard' },
          }),
        }}
      />

      <Tab.Screen
        name="Chat"
        component={LazyChatScreen}
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