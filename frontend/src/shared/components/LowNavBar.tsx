import React, { useEffect } from 'react';
import styles from '../styling/styles';
import { BottomNavigation } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../styling/colors';

const LowNavBAr = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();

  const routes = [
    { key: 'attendance', title: 'Map', icon: { active: 'map-marker', inactive: 'map-marker-outline' }, },
    { key: 'home', title: 'Home',icon: { active: 'home', inactive: 'home-outline' }, },
    { key: 'results', title: 'LeaderBoard', icon: { active: 'chart-box', inactive: 'chart-box-outline' }, },
    { key: 'chat', title: 'Chat', icon: { active: 'chat', inactive: 'chat-outline' }, },
  ];

  // match actual screen names here
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
        navigation.navigate('Employee')
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
        const iconColor = r.disabled ? '#A9A9A9' : color;

        return (
          <MaterialCommunityIcons
            name={iconName}
            size={26}
            color={colors.white}
          />
        );
      }}
      activeIndicatorStyle={{ backgroundColor: 'transparent' }}
      labeled={false}          // <‑‑ hide labels
      shifting={false}
      barStyle={styles.bottomBar}
      safeAreaInsets={{bottom: 0}}
      keyboardHidesNavigationBar={true}
    />
  );
};


export default LowNavBAr;
