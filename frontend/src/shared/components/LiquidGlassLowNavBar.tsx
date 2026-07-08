import React, { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';

import {
  LiquidGlassView,
} from '@callstack/liquid-glass';

import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getUnreadChatCount,
  subscribeUnreadChanges,
} from '../../screens/chat/services/ChatNotifications';

const LiquidGlassLowNavBar = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();

  const [unreadChats, setUnreadChats] = useState(
    getUnreadChatCount(),
  );

  useEffect(() => {
    const unsub = subscribeUnreadChanges(() => {
      setUnreadChats(getUnreadChatCount());
    });

    return () => unsub();
  }, []);

  const routes = [
    {
      key: 'attendance',
      active: 'map-marker',
      inactive: 'map-marker-outline',
    },
    {
      key: 'home',
      active: 'home',
      inactive: 'home-outline',
    },
    {
      key: 'arportal',
      active: 'cube',
      inactive: 'cube-outline',
    },
    {
      key: 'results',
      active: 'chart-box',
      inactive: 'chart-box-outline',
    },
    {
      key: 'chat',
      active: 'chat',
      inactive: 'chat-outline',
    },
  ];

  const getCurrentKey = () => {
    switch (route.name) {
      case 'StudentList':
        return 'attendance';

      case 'Dashboard':
        return 'home';

      case 'ArPortal':
        return 'arportal';

      case 'EmployeeList':
        return 'results';

      case 'Chat':
        return 'chat';

      default:
        return 'home';
    }
  };

  const activeKey = getCurrentKey();

  const navigateTo = (key: string) => {
    switch (key) {
      case 'attendance':
        navigation.navigate('Student');
        break;

      case 'home':
        navigation.navigate('Dashboard');
        break;

      case 'arportal':
        navigation.navigate('ArPortal');
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
    <View style={styles.wrapper}>
      <LiquidGlassView
        interactive
        effect="clear"
        style={styles.glass}
      >
        <View style={styles.row}>
          {routes.map(item => {
            const focused = item.key === activeKey;

            return (
              <Pressable
                key={item.key}
                onPress={() => navigateTo(item.key)}
                style={styles.tab}
              >
                <View>
                  <MaterialCommunityIcons
                    name={
                      focused
                        ? item.active
                        : item.inactive
                    }
                    size={26}
                    color="#fff"
                  />

                  {item.key === 'chat' &&
                    unreadChats > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {unreadChats > 99
                            ? '99+'
                            : unreadChats}
                        </Text>
                      </View>
                    )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </LiquidGlassView>
    </View>
  );
};

export default LiquidGlassLowNavBar;

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },

  glass: {
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    right: -8,
    top: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f43f5e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});