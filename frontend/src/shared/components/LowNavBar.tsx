import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import styles from '../styling/styles';
import { BottomNavigation } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../styling/colors';
import { getUnreadChatCount, subscribeUnreadChanges } from '../../screens/chat/services/ChatNotifications';

const LowNavBAr = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();

  const [unreadChats, setUnreadChats] = useState(getUnreadChatCount());

  useEffect(() => {
    const unsub = subscribeUnreadChanges(() => {
      setUnreadChats(getUnreadChatCount());
    });
    return () => unsub();
  }, []);

  const routes = [
    { key: 'attendance', title: 'Map', icon: { active: 'map-marker', inactive: 'map-marker-outline' }, },
    { key: 'home', title: 'Home', icon: { active: 'home', inactive: 'home-outline' }, },
    { key: 'results', title: 'LeaderBoard', icon: { active: 'chart-box', inactive: 'chart-box-outline' }, },
    { key: 'chat', title: 'Chat', icon: { active: 'chat', inactive: 'chat-outline' }, },
  ];

  const getIndexFromRoute = () => {
    switch (route.name) {
      case 'StudentList': return 0;
      case 'Dashboard': return 1;
      case 'EmployeeList': return 2;
      case 'Chat': return 3;
      default: return 1;
    }
  };

  const [index, setIndex] = React.useState(getIndexFromRoute());

  useEffect(() => {
    setIndex(getIndexFromRoute());
  }, [route.name]);

  const handleNavigation = (i: number) => {
    switch (routes[i].key) {
      case 'attendance':
        navigation.navigate('Student');
        break;
      case 'home':
        navigation.navigate('Dashboard');
        break;
      case 'results':
        navigation.navigate('Employee');
        break;
      case 'chat':
        navigation.navigate('Chat');
        break;
    }
  };

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={handleNavigation}
      renderScene={() => null}
      renderIcon={({ route, color, focused }) => {
        const r = route as any;
        const iconConfig = r.icon as { active: string; inactive: string };
        const iconName = focused ? iconConfig.active : iconConfig.inactive;

        const showBadge = r.key === 'chat' && unreadChats > 0;

        return (
          <View style={{ width: 28, height: 28 }}>
            <MaterialCommunityIcons
              name={iconName}
              size={26}
              color={colors.white}
            />
            {showBadge && (
              <View
                style={{
                  position: 'absolute',
                  right: -6,
                  top: -4,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#f43f5e',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                  {unreadChats > 99 ? '99+' : unreadChats}
                </Text>
              </View>
            )}
          </View>
        );
      }}
      activeIndicatorStyle={{ backgroundColor: 'transparent' }}
      labeled={false}
      shifting={false}
      barStyle={styles.bottomBar}
      safeAreaInsets={{ bottom: 0 }}
      keyboardHidesNavigationBar={true}
    />
  );
};

export default LowNavBAr;