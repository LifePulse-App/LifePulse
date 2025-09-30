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
    { key: 'attendance', title: 'Attendance', icon: 'calendar-multiple-check' },
    { key: 'results', title: 'Results', icon: 'chart-box-outline' },
    { key: 'settings', title: 'Settings', icon: 'account-wrench' },
  ];

  // match actual screen names here
  const getIndexFromRoute = () => {
    switch (route.name) {
      case 'Dashboard': return 0;
      case 'StudentList': return 1;
      case 'EmployeeList': return 2;
      case 'Profile': return 3;
      default: return 0;
    }
  };

  const [index, setIndex] = React.useState(getIndexFromRoute());

  useEffect(() => {
    setIndex(getIndexFromRoute());
  }, [route.name]);

  const handleNavigation = (i: number) => {
    switch (routes[i].key) {
      case 'home':
        navigation.navigate('Dashboard');
        break;
      case 'attendance':
        navigation.navigate('Student');
        break;
      case 'results':
        navigation.navigate('Employee')
        break;
      case 'settings':
        navigation.navigate('Profile');
        break;
    }
  };

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={handleNavigation}
      renderScene={() => null} // you're controlling screens via React Navigation
      renderIcon={({ route, color }) => (
        <MaterialCommunityIcons
          name={route.icon as string}
          size={22}
          color={color}

        />
      )}
      barStyle={styles.bottomBar}
      labeled
    />
  );
};


export default LowNavBAr;
