import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UserList from '../../screens/user/components/UserList/UserList';

const Stack = createNativeStackNavigator();

const UserNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="UserList" component={UserList} />
  </Stack.Navigator>
);

export default UserNavigator;
