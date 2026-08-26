import React, { useEffect, useState } from 'react';
import { View, Text, Keyboard, TouchableOpacity, StyleSheet } from 'react-native';
import styles from '../styling/styles';
import { BottomNavigation } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../styling/colors';

const LowNavBAr = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 4 standard tabs (Map, Home, [Spacer for Center Camera], LeaderBoard, AR Portal)
  // We place a dummy/transparent route in the middle so the bar reserves its layout space.
  const routes = [
    { key: 'attendance', title: 'Map', icon: { active: 'map-marker', inactive: 'map-marker-outline' } },
    { key: 'home', title: 'Home', icon: { active: 'home', inactive: 'home-outline' } },
    { key: 'center_spacer', title: '', icon: { active: '', inactive: '' } }, // ⚡ Center placeholder
       { key: 'results', title: 'LeaderBoard', icon: { active: 'chart-box', inactive: 'chart-box-outline' } },
    { key: 'arportal', title: 'AR Portal', icon: { active: 'cube', inactive: 'cube-outline' } },
  ];

  const getIndexFromRoute = () => {
    switch (route.name) {
      case 'StudentList': return 0;       // Map
      case 'Dashboard': return 1;         // Home
      case 'ArPortal': return 4;          // AR Portal
      case 'EmployeeList': return 3;      // LeaderBoard
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
      case 'arportal':
        navigation.navigate('ArPortal');
        break;
      case 'home':
        navigation.navigate('Dashboard');
        break;
      case 'results':
        navigation.navigate('Employee');
        break;
      case 'center_spacer':
        // Camera action triggered from center tab click
        navigation.navigate('ProofCamera', { habitId: null });
        break;
    }
  };

  if (keyboardVisible) return null;

  return (
    <View style={{ position: 'relative' }}>
      <BottomNavigation.Bar
        navigationState={{ index, routes }}
        onTabPress={({ route }) => {
          const i = routes.findIndex((r) => r.key === route.key);
          handleNavigation(i);
        }}
        renderIcon={({ route, color, focused }) => {
          const r = route as any;
          
          // ⚡ Render custom prominent camera button if it's the center spacer
          if (r.key === 'center_spacer') {
            return (
              <View style={localStyles.centerButtonOuter}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={localStyles.centerButtonInner}
                  onPress={() => navigation.navigate('ProofCamera', { habitId: null })}
                >
                  <MaterialCommunityIcons name="camera-outline" size={26} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          }

          const iconConfig = r.icon as { active: string; inactive: string };
          const iconName = focused ? iconConfig.active : iconConfig.inactive;

          return (
            <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name={iconName}
                size={26}
                color={colors.white}
              />
            </View>
          );
        }}
        activeIndicatorStyle={{ backgroundColor: 'transparent' }}
        labeled={false}
        style={styles.bottomBar}
        safeAreaInsets={{ bottom: 0 }}
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  centerButtonOuter: {
    position: 'absolute',
    top: -16, // Elevates the camera button slightly above the nav bar line
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
    height: 56,
  },
  centerButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7C3AED', // Sleeker purple accent matching your app's theme
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
});

export default LowNavBAr;