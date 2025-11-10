import React, { useContext, useEffect, useState } from 'react';
import Toast from "react-native-toast-message";
import {
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import AuthContext from '../../../auth/user/UserContext';
import UserStorage from '../../../auth/user/UserStorage';
import { UserLoginResponse } from '../../user/models/UserLoginResponse';
import { setAuthHeaders, setSecretKey } from '../../../auth/api-client/api_client';
import api_Login from '../services/api_Login';
import LoaderKitView from 'react-native-loader-kit';
import AppText from '../../../components/Layout/AppText/AppText';
import { loginStyles } from './Loginstyles';
import DeviceInfo from 'react-native-device-info';

// ✅ Google Sign-In
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  "webClientId": "166800210069-pvjp2265cd9cmirvcouru83qcknn6ouk.apps.googleusercontent.com",
  "iosClientId": "166800210069-hlg4drj85lotn4ql77puddef8r61d44v.apps.googleusercontent.com"
});

const Login = ({ navigation }: any) => {
  const styles = loginStyles();

  const [check, setCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const authContext = useContext(AuthContext);
  const [googleLoading, setGoogleLoading] = useState(false);


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

  // ✅ Email/Password login
  const handleSubmit = async (values: any) => {
    Keyboard.dismiss();
    setLoading(true);

    if (values.username === "" || values.password === "") {
      setLoading(false);
      return Toast.show({ type: 'error', text1: 'Email and Password are required!' });
    }

    setSecretKey();
    const deviceId = await DeviceInfo.getUniqueId(); 
    
    const response = await api_Login.getLogin(values.username, values.password, deviceId);

    if (!response.ok) {
      UserStorage.deleteUser();
      authContext?.setUser(null);
      setLoading(false);
      return Toast.show({ type: 'error', text1: `${response.data?.message}` });
    }

    const user = response.data as UserLoginResponse;
    user.UserName = values.username;
    user.Password = values.password;
    setAuthHeaders(user.accessToken);

    authContext?.setUser(user);
    if (check) UserStorage.setUser(user);

    navigation.navigate('Drawer');
    setLoading(false);
  };

  // ✅ Google Login
  const handleGoogleLogin = async () => {
    if (googleLoading) return; // prevent duplicate calls
    setGoogleLoading(true);
    setSecretKey();
    try {

      await GoogleSignin.hasPlayServices()
      const data = await GoogleSignin.signIn();
      

      if (data?.type !== "success") {
        return Toast.show({ type: 'error', text1: 'Google login failed' });
      }

      const deviceId = await DeviceInfo.getUniqueId(); 
      const idToken = data?.data?.idToken
      
      const response = await api_Login.googleLogin(idToken, deviceId);
      console.log(response);
      
      
      if (!response.ok) {
        return Toast.show({ type: 'error', text1: 'Google login failed' });
      }

      const user = response.data as UserLoginResponse;
      setAuthHeaders(user.accessToken);
      authContext?.setUser(user);
       UserStorage.setAccessToken(user.accessToken);
       UserStorage.setRefreshToken(user.refreshToken);

      navigation.navigate('Drawer');
    } catch (err: any) {
      console.log("Google Sign-In Error:", JSON.stringify(err, null, 2));
      Toast.show({ type: 'error', text1: 'Google sign-in error' });
    } finally {
      setGoogleLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ width: "100%", alignItems: "center" }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Title & Subtitle */}
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        {/* Google Login */}
        <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin} disabled={googleLoading}>
          <Image
            source={{ uri: "https://img.icons8.com/color/48/google-logo.png" }}
            style={{ width: 25, height: 25 }}
          />
          <Text style={styles.socialText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Username */}
        <TextInput
          label="Email"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
          mode="outlined"
          autoCapitalize="none"
          activeOutlineColor="#5a75c2"
        />

        {/* Password */}
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
          activeOutlineColor="#5a75c2"
        />

        {/* Forgot Password */}
        <Text style={styles.forgotPasswordText}>Forgot password?</Text>

        {/* Loader or Button */}
        {loading ? (
          <View style={styles.loadingOverlay}>
            <LoaderKitView
              style={{ width: 50, height: 50 }}
              name={'BallSpinFadeLoader'}
              animationSpeedMultiplier={1.0}
              color={"#5a75c2"}
            />
            <AppText style={styles.loadingText}>Logging in...</AppText>
          </View>
        ) : (
          <Button
            onPress={() => handleSubmit({ username, password })}
            style={styles.button}
          >
            <AppText style={styles.buttonText}>Sign in</AppText>
          </Button>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <Text style={styles.footerLink} onPress={() => navigation.navigate("Register")}>
            Register
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;
