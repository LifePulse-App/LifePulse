import {Alert} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {UserLoginResponse} from '../../screens/user/models/UserLoginResponse';

const key = 'authToken';
const ACCESS_TOKEN_KEY = 'ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'REFRESH_TOKEN';

const setUser = async (User: UserLoginResponse) => {
  try {
    await Keychain.setGenericPassword(JSON.stringify(User), User.Password ?? '');
  } catch (error: any) {
    console.log('Keychain setUser error:', error);
    Alert.alert('Error', `Error Storing User: ${String(error?.message || error)}`);
  }
};

const getUser = async () => {
  try {
    return await Keychain.getGenericPassword();
  } catch (error) {
    Alert.alert('Error', 'Error Getting User');
  }
};

const deleteUser = async () => {
  try {
    return await Keychain.resetGenericPassword();
  } catch (error) {
    Alert.alert('Error', 'Error Deleting User');
  }
};

// Access token
const setAccessToken = async (accessToken: string) => {
  try {
    await Keychain.setInternetCredentials(ACCESS_TOKEN_KEY, ACCESS_TOKEN_KEY, accessToken);
  } catch (error) {
    Alert.alert('Error', 'Error storing access token');
  }
};

const getAccessToken = async (): Promise<string | null> => {
  try {
    const creds = await Keychain.getInternetCredentials(ACCESS_TOKEN_KEY);
    return creds?.password || null;
  } catch (error) {
    Alert.alert('Error', 'Error getting access token');
    return null;
  }
};

// Refresh token
const setRefreshToken = async (refreshToken: string) => {
  try {
    await Keychain.setInternetCredentials(REFRESH_TOKEN_KEY, REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    Alert.alert('Error', 'Error storing refresh token');
  }
};

const getRefreshToken = async (): Promise<string | null> => {
  try {
    const creds = await Keychain.getInternetCredentials(REFRESH_TOKEN_KEY);
    return creds?.password || null;
  } catch (error) {
    Alert.alert('Error', 'Error getting refresh token');
    return null;
  }
};

// Clear tokens
const clearTokens = async () => {
  try {
    await Keychain.resetInternetCredentials(ACCESS_TOKEN_KEY);
    await Keychain.resetInternetCredentials(REFRESH_TOKEN_KEY);
  } catch (error) {
    Alert.alert('Error', 'Error clearing tokens');
  }
};

export default {getUser, setUser, deleteUser, setAccessToken, setRefreshToken, getAccessToken, getRefreshToken, clearTokens};
