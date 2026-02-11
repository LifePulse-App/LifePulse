// navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import StudentList from '../../screens/mood-map/components/studentlist/StudentList';
import EmployeeList from '../../screens/leaderboard/components/leaderboard/leaderboard';
import UserList from '../../screens/user/components/UserList/UserList';
import CustomBottomNav from '../../shared/components/LowNavBar';
import ProofVisionCameraScreen from '../../screens/proof-camera/Camera';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <CustomBottomNav {...props} />}
  >
    <Tab.Screen name="Student" component={StudentList} />
    <Stack.Screen name="ProofCamera" component={ProofVisionCameraScreen} />
    <Tab.Screen name="Dashboard" component={Dashboard} />
    <Tab.Screen name="Add" component={() => null} />
    <Tab.Screen name="EmployeeList" component={EmployeeList} />
    <Tab.Screen name="UserList" component={UserList} />
  </Tab.Navigator>
  );
};

export default MainTabs;