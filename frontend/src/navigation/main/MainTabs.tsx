// navigation/MainTabs.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import StudentList from '../../screens/student/components/studentlist/StudentList';
import EmployeeList from '../../screens/employee/components/employee-list/EmployeeList';
import UserList from '../../screens/user/components/UserList/UserList';
import CustomBottomNav from '../../shared/components/LowNavBar'; // <- FAB + navbar
import Fee from '../../screens/student/components/fee/Fee';
import Overdues from '../../screens/student/components/overdues/Overdues';

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomBottomNav {...props} />}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Student" component={StudentList} />
      <Tab.Screen name="Add" component={() => null} /> {/* Placeholder for FAB */}
      <Tab.Screen name="EmployeeList" component={EmployeeList} />
      <Tab.Screen name="UserList" component={UserList} />
    </Tab.Navigator>
  );
};

export default MainTabs;
