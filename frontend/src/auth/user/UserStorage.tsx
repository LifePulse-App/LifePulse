import {Alert} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {UserLoginResponse} from '../../screens/user/models/UserLoginResponse';

const key = 'authToken';

const setUser = async (User: UserLoginResponse) => {
  try {
    await Keychain.setGenericPassword(JSON.stringify(User), User.Password);
  } catch (error) {
    Alert.alert('Error', 'Error Storing User');
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

export default {getUser, setUser, deleteUser};
