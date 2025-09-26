import React, { useContext, useEffect, useState } from 'react';
import Toast from "react-native-toast-message"
import {
  Alert,
  ImageBackground,
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import styles from './Loginstyles';
import { Card, TextInput, Button, Checkbox, ActivityIndicator, Text } from 'react-native-paper';
import AuthContext from '../../../auth/user/UserContext';
import UserStorage from '../../../auth/user/UserStorage';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';
import { setAuthHeaders, setSecretKey } from '../../../auth/api-client/api_client';
import api_Login from '../services/api_Login';
import api_InstituteProfile from '../services/api_Login';
import AppActivityIndicator from '../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import LoaderKitView from 'react-native-loader-kit';
import colors from '../../../shared/styling/colors';
import AppText from '../../../components/Layout/AppText/AppText';

const Login = ({ navigation }: any) => {
  const [check, setCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const authContext = useContext(AuthContext);

  const restoreUser = async () => {
    const data = await UserStorage.getUser();
    if (!data) return;

    const objuser = JSON.parse(data.username);
    setUsername(objuser.UserName);
    setPassword(data.password);

    handleSubmit({ username: objuser.UserName, password: data.password });
  };

  useEffect(() => {
    restoreUser();
  }, []);

  const handleSubmit = async (values: any) => {
    setLoading(true);


    if(values.username === "" || values.password === "") {
      setLoading(false);
      return Toast.show({ type: 'error', text1: 'Username and Password are required!'});
    }

    setSecretKey();

    const response = await api_Login.getLogin(values.username, values.password);

    if (!response.ok) {
      UserStorage.deleteUser();
      authContext?.setUser(null);
      setLoading(false);
      console.log(response);
      
      return Toast.show({ type: 'error', text1: 'Server is Down...'});
    }

    if (
      typeof response.data === 'object' &&
      response.data !== null &&
      'Success' in response.data
    ) {
      const responseData = response.data as { Message: string; Success: boolean };

      if (!responseData.Success) {
        UserStorage.deleteUser();
        authContext?.setUser(null);
        setLoading(false);
        return Toast.show({ type: 'error', text1: 'Username or Password is incorrect!'});
      }
    } else {
      const user = response.data as UserLoginResponse;
      user.Password = values.password;
      setAuthHeaders(user.Token, user);

      const InstituteProfileResponse = await api_InstituteProfile.GetInstituteProfile(
        user.InstituteId,
        user.BranchId,
        true
      );

      if (!InstituteProfileResponse.ok) {
        setLoading(false);
        return Toast.show({ type: 'error', text1: 'Error Fetching Data!'});
      }

      if (
        typeof InstituteProfileResponse.data === 'object' &&
        InstituteProfileResponse.data !== null
      ) {
        user.InstituteProfile = InstituteProfileResponse.data;
      }

      authContext?.setUser(user);
      if (check) UserStorage.setUser(user);

      navigation.navigate('Drawer');
    }

    setLoading(false);
  };

  return (
    <ImageBackground
      source={require('../../../shared/assets/login_bg_white.png')} // replace with your background image path
      style={styles.background}
      resizeMode="cover">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../shared/assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="account" />}
              autoCapitalize="none"
              activeOutlineColor='#5a75c2'
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="lock" />}
            />

            <View style={styles.checkboxContainer}>
              <Checkbox
                status={check ? 'checked' : 'unchecked'}
                onPress={() => setCheck(!check)}
                color='#5a75c2'
              />
              <Text>Remember Me</Text>
            </View>

            {loading ? (
             <View style={styles.loadingOverlay}>
             <LoaderKitView
         style={{ width: 60, height: 60 }}
         name={'BallSpinFadeLoader'}
         animationSpeedMultiplier={1.0} // speed up/slow down animation, default: 1.0, larger is faster
         color={colors.primary} // Optional: color can be: 'red', 'green',... or '#ddd', '#ffffff',...
       />
       <AppText style={styles.loadingText}>Logging in...</AppText>
           </View>
) : (
  <Button
    onPress={() => handleSubmit({ username, password })}
    style={styles.button}>
      <AppText style={{color: "white"}}>
    Login
    </AppText>
  </Button>
)}

          </Card.Content>
        </Card>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default Login;
