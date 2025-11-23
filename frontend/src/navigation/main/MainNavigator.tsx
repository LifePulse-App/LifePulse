import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import StudentList from '../../screens/student/components/studentlist/StudentList';
import EmployeeList from '../../screens/employee/components/employee-list/EmployeeList';
import UserList from '../../screens/user/components/UserList/UserList';
import AnnualItemDetails from '../../screens/student/components/overdues/AnnualItemDetails';
import Overdues from '../../screens/student/components/overdues/Overdues';
import UserNavigator from '../user/UserNavigator';
import MoodScreen from '../../screens/moodscreen/comp/component/MoodScreen';
import ProofVisionCameraScreen from '../../screens/proof-camera/Camera';

const Stack = createNativeStackNavigator();

const MainNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={Dashboard} />
    <Stack.Screen name="MoodScreen" component={MoodScreen} />
    <Stack.Screen name="Student" component={StudentList} />
    <Stack.Screen name="EmployeeList" component={EmployeeList} />
    <Stack.Screen name="User" component={UserNavigator} />
    <Stack.Screen name="ProofCamera" component={ProofVisionCameraScreen} />
    <Stack.Screen name="UserList" component={UserList} />
    <Stack.Screen name="AnnualItemDetails" component={AnnualItemDetails} />
  </Stack.Navigator>
);

export default MainNavigator;
