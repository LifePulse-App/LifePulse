// navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import StudentList from '../../screens/mood-map/components/mood-map/MoodMap';
import EmployeeList from '../../screens/leaderboard/components/leaderboard/leaderboard';
import UserList from '../../screens/user/components/UserList/UserList';
import CustomNavBar from '../../shared/components/LowNavBar';
import ProofVisionCameraScreen from '../../screens/proof-camera/Camera';
import ArPortalScreen from '../../screens/AR-Model/components/ar_screen';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <CustomNavBar {...props} />}
  >
    <Tab.Screen name="Student" component={StudentList} />
    <Tab.Screen name="Dashboard" component={Dashboard} />
    <Tab.Screen name="Add" component={() => null} />
    <Tab.Screen name="EmployeeList" component={EmployeeList} />
    <Tab.Screen name="UserList" component={UserList} />
  </Tab.Navigator>
  );
};

export default MainTabs;