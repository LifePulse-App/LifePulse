import React, { useEffect } from 'react';
import styles from '../styling/styles';
import { BottomNavigation } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Text } from 'react-native';

const LowNavBAr = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();

  const routes = [
    { key: 'home', title: 'Home', icon: 'home' },
    { key: 'search', title: 'Search', icon: 'magnify', disabled: true },
    { key: 'notifications', title: 'Notification', icon: 'bell', disabled: true },
    { key: 'profile', title: 'Profile', icon: 'account-outline' },
  ];

  const getIndexFromRoute = () => {
    switch (route.name) {
      case 'Dashboard': return 0;
      case 'Search': return 1;
      case 'Notifications': return 2;
      case 'Profile': return 3;
      default: return 0;
    }
  };

  const [index, setIndex] = React.useState(getIndexFromRoute());

  useEffect(() => {
    setIndex(getIndexFromRoute());
  }, [route.name]);

  const handleNavigation = (i: number) => {
    if (routes[i].disabled) return; // Skip navigation if disabled

    switch (routes[i].key) {
      case 'home':
        navigation.navigate('Dashboard');
        break;
      case 'search':
        navigation.navigate('Search');
        break;
      case 'notifications':
        navigation.navigate('Notifications');
        break;
      case 'profile':
        navigation.navigate('Profile');
        break;
    }
  };

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={handleNavigation}
      renderScene={() => null}
      renderIcon={({ route, color }) => {
        const iconColor = (route as any).disabled ? '#A9A9A9' : color;
        return (
          <MaterialCommunityIcons
            name={route.icon as string}
            size={20}
            color={iconColor}
          />
        );
      }}
      barStyle={styles.bottomBar}
      labeled={true}
      shifting={false}
      sceneAnimationEnabled={false}
    />
  );
};

export default LowNavBAr;
