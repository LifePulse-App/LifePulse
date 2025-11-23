import React, {useState, useContext, useRef} from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {
  Image,
  Pressable,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import {Card} from '@rneui/base';
import AppText from '../../components/Layout/AppText/AppText';
import AuthContext from '../../auth/user/UserContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../../shared/styling/lightModeColors';
import Dashboard from '../dashboard/components/dashboard/Dashboard';
import StudentNavigator from '../../navigation/student/StudentNavigator';
import EmployeeNavigator from '../../navigation/employee/EmployeeNavigator';
import UserNavigator from '../../navigation/user/UserNavigator';
import ProfileScreen from '../profile/components/Profile';



const Drawer = createDrawerNavigator();



// ✅ DrawerNavigator main
const DrawerNavigator = () => (
  <Drawer.Navigator>
    <Drawer.Screen name="Dashboard" component={Dashboard} options={{headerShown: false}} />
    <Drawer.Screen name="Student" component={StudentNavigator} options={{headerShown: false}} />
    <Drawer.Screen name="Employee" component={EmployeeNavigator} options={{headerShown: false}} />
    <Drawer.Screen name="User" component={UserNavigator} options={{headerShown: false}} />
    <Drawer.Screen name="Profile" component={ProfileScreen} options={{headerShown: false}} />
  </Drawer.Navigator>
);

export default DrawerNavigator;
