import React, { useContext, useState, useEffect } from 'react';
import { View, Image, Pressable, Alert, Switch } from 'react-native';
import AppText from '../../../components/Layout/AppText/AppText';
import AuthContext from '../../../auth/user/UserContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import styles from './ChatStyles';
import MainLayout from '../../../shared/components/MainLayout';
import colors from '../../../shared/styling/lightModeColors';
import LogoutConfirmationModal from '../../logout-popup/components/LogoutConfirmationModal';
import sharedApi from '../../../shared/services/shared-api';
import UserStorage from '../../../auth/user/UserStorage';
import { CommonActions } from '@react-navigation/native';
import AppActivityIndicator from '../../../components/Layout/AppActivityIndicator/AppActivityIndicator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import { checkBiometricAvailability } from '../../../shared/services/biometrichelper';

const rnBiometrics = new ReactNativeBiometrics();

const ChatScreen = ({ navigation }: any) => {
  const authContext = useContext(AuthContext);

  const id = authContext?.User?.user?.id
  const refreshToken = authContext?.User?.refreshToken

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // New biometric toggle state
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  

  // Load saved setting
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('biometricEnabled');
      if (saved === 'true') setBiometricEnabled(true);
    })();
  }, []);

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const { available, biometryType } = await checkBiometricAvailability();
      

      if (!available) {
        Alert.alert('Not Supported', 'Your device does not support biometrics.');
        return;
      }

      Alert.alert(
        'Enable Biometrics',
        `Do you want to enable ${biometryType === 'FaceID' ? 'Face ID' : 'Fingerprint'} login?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Enable',
            onPress: async () => {
              setBiometricEnabled(true);
              await AsyncStorage.setItem('biometricEnabled', 'true');
            },
          },
        ]
      );
    } else {
      setBiometricEnabled(false);
      await AsyncStorage.setItem('biometricEnabled', 'false');
    }
  };

  const renderAvatar = () => {
    const baseURL = authContext?.User?.ImagePath;

    if (authContext?.User?.ImagePath) {
      return <Image source={{ uri: baseURL }} style={styles.image} />;
    } else {
      return (
        <Image
          source={require('../../../shared/assets/default-logo.jpg')}
          style={styles.image}
          resizeMode="cover"
        />
      );
    }
  };

  const logoutHandler = () => {
    setShowLogoutModal(true);
  };

  return (
    <MainLayout>
      {isLoggingOut && <AppActivityIndicator visible={true} />}
      <View style={styles.container}>
        <View style={styles.uppercontainer}>
          <AppText
            style={{
              textAlign: 'start',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 18,
              marginLeft: '6%',
            }}
          >
            Privacy & Settings
          </AppText>
        </View>

        {/* Biometric Toggle */}
        <View style={styles.settingRow}>
          <AppText style={styles.settingText}>Enable Biometric Login</AppText>
          <Switch
            value={biometricEnabled}
            onValueChange={toggleBiometric}
            trackColor={{ false: '#ccc', true: colors.primary }}
            thumbColor={biometricEnabled ? colors.primary : '#f4f3f4'}
          />
        </View>

        {/* Developer Info Button */}
<Pressable
  style={styles.devButton}
  onPress={() =>
    Alert.alert(
      "Developer Info",
      "Developed by Syed Ali Asghar\n\n  AI Student at NUST (NBC)",
      [{ text: "OK" }]
    )
  }
>
  <Icon name="information-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
  <AppText style={styles.devText}>About Developer</AppText>
</Pressable>


        {/* Logout Button */}
        <Pressable style={styles.devButton} onPress={logoutHandler}>
          <Icon name="logout" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <AppText style={styles.logoutText}>Logout</AppText>
        </Pressable>
      </View>

      {/* Logout Modal */}
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={async () => {
          try {
            setIsLoggingOut(true); // show loader
            await sharedApi.LogoutUser(id, refreshToken);
            
            UserStorage.deleteUser();
            setShowLogoutModal(false);

            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          } catch (error) {
            console.error('Logout failed:', error);
            Alert.alert('Error', 'Logout failed. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        }}
      />
    </MainLayout>
  );
};

export default ChatScreen;
