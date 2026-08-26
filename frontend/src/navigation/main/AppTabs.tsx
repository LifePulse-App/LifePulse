import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';

import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
// import ChatScreen from '../../screens/chat/components/Chat'; // Omitted to match LowNavBAr screens
import ARCameraView from '../../screens/AR-Model/components/ar_screen';
import MoodMap from '../../screens/mood-map/components/mood-map/MoodMap';
import LeaderboardScreen from '../../screens/leaderboard/components/leaderboard/leaderboard';
// import { getUnreadChatCount, subscribeUnreadChanges } from '../../screens/chat/services/ChatNotifications';

const Tab = createNativeBottomTabNavigator();

const ProofCameraProxyScreen = ({ navigation }: any) => {
  useFocusEffect(
    useCallback(() => {
      // Immediately open the camera screen
      navigation.navigate('ProofCamera', { habitId: null });
      
      // Optional: switch back to Home so the tab doesn't get "stuck" on the proxy
      // navigation.navigate('Dashboard'); 
    }, [navigation])
  );

  return <View style={{ flex: 1, backgroundColor: '#050816' }} />; // Match app bg color
};

// 1. Create a Lazy Load Wrapper
const withLazyLoad = (Component) => (props) => {
  const isFocused = useIsFocused();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (isFocused && !hasMounted) {
      setHasMounted(true);
    }
  }, [isFocused, hasMounted]);

  if (!hasMounted) {
    return <View style={{ flex: 1, backgroundColor: '#050816' }} />;
  }

  return <Component {...props} />;
};

// 2. Wrap your heavy components
const LazyMoodMap = withLazyLoad(MoodMap);
const LazyDashboard = withLazyLoad(Dashboard);
const LazyLeaderboardScreen = withLazyLoad(LeaderboardScreen);
const LazyARCameraView = withLazyLoad(ARCameraView);

// Dummy component for the center camera tab that doesn't actually render
const DummyScreen = () => null;

export default function AppTabs() {
  /* Chat notification logic kept for your reference if you need it later
  const [unreadChats, setUnreadChats] = useState(getUnreadChatCount());
  useEffect(() => {
    const unsub = subscribeUnreadChanges(() => {
      setUnreadChats(getUnreadChatCount());
    });
    return () => unsub();
  }, []);
  */

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
      {/* 1. Map */}
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

      {/* 2. Home */}
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

      {/* 3. Center Camera (Action Trigger) */}
    <Tab.Screen
  name="ProofCameraProxy"
  component={ProofCameraProxyScreen}
  options={{
    tabBarLabel: 'Camera',
    tabBarIcon: Platform.select({
      ios: { type: 'sfSymbol', name: 'camera' },
      android: { type: 'materialSymbol', name: 'camera' },
    }),
  }}
/>

      {/* 4. LeaderBoard */}
      <Tab.Screen
        name="Employee"
        component={LazyLeaderboardScreen}
        options={{
          tabBarLabel: 'LeaderBoard',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'chart.bar' },
            android: { type: 'materialSymbol', name: 'leaderboard' },
          }),
        }}
      />

      {/* 5. AR Portal */}
      <Tab.Screen
        name="ArPortal"
        component={LazyARCameraView}
        options={{
          tabBarLabel: 'AR Portal',
          tabBarStyle: { display: 'none' }, // Hides the tab bar inside AR mode
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'cube' },
            android: { type: 'materialSymbol', name: 'view_in_ar' },
          }),
        }}
      />
    </Tab.Navigator>
  );
}