import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EmployeeList from '../../screens/employee/components/employee-list/EmployeeList';
import Loans from '../../screens/employee/components/loans/Loans';

const Stack = createNativeStackNavigator();

const EmployeeNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EmployeeList" component={EmployeeList} />
    <Stack.Screen name="EmployeeLoan" component={Loans} />
  </Stack.Navigator>
);

export default EmployeeNavigator;
