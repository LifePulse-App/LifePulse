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
import colors from '../../shared/styling/colors';
import Dashboard from '../dashboard/components/dashboard/Dashboard';
import StudentNavigator from '../../navigation/student/StudentNavigator';
import EmployeeNavigator from '../../navigation/employee/EmployeeNavigator';
import UserNavigator from '../../navigation/user/UserNavigator';
import ProfileScreen from '../profile/components/Profile';
import ChangePasswordModal from '../changepassword-popup/components/ChangePasswordPopup';
import UserStorage from '../../auth/user/UserStorage';
import styles from './Drawerstyles';
import LogoutConfirmationModal from '../logout-popup/components/LogoutConfirmationModal';
import sharedApi from '../../shared/services/shared-api';
import { IMAGE_BASE_URL } from '@env';
import { CommonActions } from '@react-navigation/native';
import { UserLogin } from '../user/models/UserLoginResponse';
import AppActivityIndicator from '../../components/Layout/AppActivityIndicator/AppActivityIndicator';


const Drawer = createDrawerNavigator();

const CustomDrawer = ({navigation}: any) => {
  const authContext = useContext(AuthContext);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isChangePasswordVisible, setChangePasswordVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigationRef = useRef<any>(null);
  const [User, setUser] = useState<UserLogin | undefined>();
  const [isLoggingOut, setIsLoggingOut] = useState(false);



  const logoutHandler = () => {
    setShowLogoutModal(true);
  };  

  const renderLogo = () => {
    const imageURL =  IMAGE_BASE_URL + authContext?.User?.ImagePath;
    const initials = authContext?.User?.FirstName?.charAt(0)?.toUpperCase() || '?';

    return authContext?.User?.ImagePath ? (
      <Image source={{uri: imageURL}} style={styles.image} resizeMode="cover"/>
    ) : (
      <View style={styles.logoContainer}>
        <AppText style={styles.logoText}>{initials}</AppText>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoggingOut && <AppActivityIndicator visible={true} />}
      <Card containerStyle={styles.card}>
        <View style={styles.innercontainer}>
          <View style={styles.imagecontainer}>{renderLogo()}</View>
          <View style={styles.details_container}>
            <AppText style={styles.title}>{authContext?.User?.UserName}</AppText>
            <AppText style={styles.subheading}>{authContext?.User?.RoleName}</AppText>
            <AppText style={styles.text_subheading}>
              Joining: {authContext?.User?.Since}
            </AppText>
          </View>
        </View>
      </Card>

      <ScrollView contentContainerStyle={styles.menuContainer}>
        {/* Main Screens */}
        <DrawerItem
          icon="view-dashboard"
          label="Dashboard"
          onPress={() => navigation.navigate('Dashboard')}
        />
        <DrawerItem
          icon="school"
          label="Student"
          onPress={() => navigation.navigate('Student')}
        />
        <DrawerItem
          icon="account-group"
          label="Employee"
          onPress={() => navigation.navigate('Employee')}
        />
        <DrawerItem
          icon="account"
          label="User"
          onPress={() => navigation.navigate('User')}
        />

        {/* Settings */}
        <Pressable onPress={() => setIsAccountOpen(!isAccountOpen)} style={styles.menuItem}>
          <Icon name="account-circle" size={24} color={colors.black} />
          <AppText style={styles.text_heading}>Settings</AppText>
          <Icon
            name={isAccountOpen ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.black}
            style={{marginLeft: 'auto'}}
          />
        </Pressable>

        {/* Sub-menu */}
        {isAccountOpen && (
          <View style={styles.subMenuContainer}>
            <DrawerItem
              icon="account-box"
              label="Profile"
              isSub
              onPress={() => navigation.navigate('Profile')}
            />
            <DrawerItem
              icon="lock-reset"
              label="Change Password"
              isSub
              onPress={() => setChangePasswordVisible(true)}
            />
            <DrawerItem
              icon="logout"
              label="Logout"
              isSub
              onPress={logoutHandler}
            />
          </View>
        )}
      </ScrollView>

      <ChangePasswordModal
        visible={isChangePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />
      <LogoutConfirmationModal
  visible={showLogoutModal}
  onClose={() => setShowLogoutModal(false)}
  onConfirm={async () => {
    try {
      setIsLoggingOut(true); // Start loader
      await sharedApi.LogoutUser();
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
      setIsLoggingOut(false); // Stop loader
    }
  }}
  
/>

    </View>
  );
};

// ✅ Reusable Drawer Item component
const DrawerItem = ({
  icon,
  label,
  onPress,
  isSub = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  isSub?: boolean;
}) => (
  <Pressable onPress={onPress} style={isSub ? styles.subMenuItem : styles.menuItem}>
    <Icon name={icon} size={20} color={colors.black} style={{marginRight: 12}} />
    <AppText style={styles.text_heading}>{label}</AppText>
  </Pressable>
);

// ✅ DrawerNavigator main
const DrawerNavigator = () => (
  <Drawer.Navigator drawerContent={props => <CustomDrawer {...props} />}>
    <Drawer.Screen name="Dashboard" component={Dashboard} options={{headerShown: false}} />
    <Drawer.Screen name="Student" component={StudentNavigator} options={{headerShown: false}} />
    <Drawer.Screen name="Employee" component={EmployeeNavigator} options={{headerShown: false}} />
    <Drawer.Screen name="User" component={UserNavigator} options={{headerShown: false}} />
    <Drawer.Screen name="Profile" component={ProfileScreen} options={{headerShown: false}} />
  </Drawer.Navigator>
);

export default DrawerNavigator;
