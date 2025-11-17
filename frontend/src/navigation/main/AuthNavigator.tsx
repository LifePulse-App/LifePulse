import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from '../../screens/login/components/Login';
import DrawerNavigator from '../../screens/drawer/DrawerNavigator';
import Register from '../../screens/login/components/Register';
import VerifyOtp from '../../screens/login/components/VerifyOTP';
import ResetPassVerifyOTP from '../../screens/login/components/ResetPassVerifyOTP';
import SetPassVerifiedOTP from '../../screens/login/components/SetPass';
import ForgotPass from '../../screens/login/components/ForgotPass';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={Login} />
    <Stack.Screen name="VerifyOtp" component={VerifyOtp} />
    <Stack.Screen name="ForgotPass" component={ForgotPass} />
    <Stack.Screen name="ResetPassVerifyOtp" component={ResetPassVerifyOTP} />
    <Stack.Screen name="SetPass" component={SetPassVerifiedOTP} />
    <Stack.Screen name="Register" component={Register} />
    <Stack.Screen name="Drawer" component={DrawerNavigator} />
  </Stack.Navigator>
);

export default AuthNavigator;
