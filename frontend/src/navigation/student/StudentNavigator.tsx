import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import StudentList from '../../screens/student/components/studentlist/StudentList';
import Adjustment from '../../screens/student/components/adjustment/Adjustment';
import StudentTabNavigator from './StudentTabNavigator';
import AnnualItemDetails from '../../screens/student/components/overdues/AnnualItemDetails';
import AdjustmentDetailScreen from '../../screens/student/components/adjustment-details/AdjustmentDetailScreen';

// Define stack type if needed (optional for now)
const Stack = createNativeStackNavigator();

const StudentNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StudentList" component={StudentList} />
    <Stack.Screen name="StudentTabNavigator" component={StudentTabNavigator} />
    <Stack.Screen name="Adjustment" component={Adjustment} />
    <Stack.Screen name="AdjustmentDetailScreen" component={AdjustmentDetailScreen} />
    <Stack.Screen name="AnnualItemDetails" component={AnnualItemDetails} />

  </Stack.Navigator>
);

export default StudentNavigator;
