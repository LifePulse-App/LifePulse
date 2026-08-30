import React, { useContext, useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, Animated, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import NativeTabs from './NativeTabs';
import Login from '../../screens/login/components/Login';
import DrawerNavigator from '../../screens/drawer/DrawerNavigator';
import Register from '../../screens/login/components/Register';
import VerifyOtp from '../../screens/login/components/VerifyOTP';
import ResetPassVerifyOTP from '../../screens/login/components/ResetPassVerifyOTP';
import SetPassVerifiedOTP from '../../screens/login/components/SetPass';
import ForgotPass from '../../screens/login/components/ForgotPass';

import UserStorage from '../../auth/user/UserStorage';
import { UserLoginResponse } from '../../screens/user/models/UserLoginResponse';
import AuthContext from '../../auth/user/UserContext';
import { setAuthHeaders, setSecretKey } from '../../auth/api-client/api_client';
import MoodScreen from '../../screens/moodscreen/comp/component/MoodScreen';
import Dashboard from '../../screens/dashboard/components/dashboard/Dashboard';
import ProofVisionCameraScreen from '../../screens/proof-camera/Camera';
import Friends from '../../screens/friends/components/Friends';
import EditProfileScreen from '../../screens/profile/components/EditProfile';
import TwoFAScreen from '../../screens/login/components/TwoFAScreen';
import Enable2FAScreen from '../../screens/profile/components/Enable2FaScreen';
import DevicesScreen from '../../screens/profile/components/DevicesScreen';
import HelpSupportScreen from '../../screens/profile/components/HelpSupportScreen';
import ReportProblemScreen from '../../screens/profile/components/ReportProblemScreen';
import LegalPolicyScreen from '../../screens/profile/components/LegalPolicyScreen';
import AvatarCustomizeScreen from '../../screens/profile/components/AvatarCustomizeScreen';
import AvatarCreatorScreen from '../../screens/profile/components/AvatarCreatorScreen';
import NewChatScreen from '../../screens/chat/components/NewChatScreen';
import ChatScreen from '../../screens/chat/components/ChatScreen';
import SavedAccountsScreen from '../../screens/login/components/SavedAccountsScreen';
import { KeyboardProvider } from "react-native-keyboard-controller"

const Stack = createNativeStackNavigator();
const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const styles = loginStyles();

  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (animatedValue: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 9000,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 9000,
            useNativeDriver: true,
          }),
        ]),
      );

    makeLoop(anim1, 0).start();
    makeLoop(anim2, 1500).start();
  }, [anim1, anim2]);

  // Interpolated transforms matching the precise motion of glowTop and glowBottom
  const glowTopStyle = {
    transform: [
      {
        translateX: anim1.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, 30],
        }),
      },
      {
        translateY: anim1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 25],
        }),
      },
    ],
  };

  const glowBottomStyle = {
    transform: [
      {
        translateX: anim2.interpolate({
          inputRange: [0, 1],
          outputRange: [25, -25],
        }),
      },
      {
        translateY: anim2.interpolate({
          inputRange: [0, 1],
          outputRange: [10, -15],
        }),
      },
    ],
  };

  return (
    <View style={styles.root}>
      <View style={styles.baseBackground} />

      {/* Top Glow matching Login screen style */}
      <Animated.View style={[styles.glowTop, glowTopStyle]} />

      {/* Bottom Glow matching Login screen style */}
      <Animated.View style={[styles.glowBottom, glowBottomStyle]} />

      {/* Centered Loading Indicator */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    </View>
  );
};

  // 1. THE HEADLESS NAVIGATION LISTENER
// This renders nothing, but watches the CallContext to trigger screen changes automatically.
const CallNavigationListener = () => {
  const navigation = useNavigation<any>();
  const callContext = useContext(CallContext);

  useEffect(() => {
    if (!callContext?.currentSession) return;

    const { status, isIncoming } = callContext.currentSession;

    if (status === 'initiating') {
      navigation.navigate('OutgoingCallScreen');
    } else if (status === 'ringing' && isIncoming) {
      navigation.navigate('IncomingCallScreen');
    } else if (status === 'connected') {
      navigation.navigate('VoiceCallScreen');
    }
  }, [callContext?.currentSession?.status]);

  return null;
};

import SavedAccountsStorage from "../../auth/user/SavedAccountsStorage";
import FriendsListScreen from '../../screens/friends/components/FriendsList';
import ProfilePreviewScreen from '../../screens/profile/components/ProfilePreview';
import HabitDetailScreen from '../../screens/dashboard/components/dashboard/HabitDetailScreen';
import ArPortalScreen from '../../screens/AR-Model/components/ar_screen';
import ARCameraView from '../../screens/AR-Model/components/ar_screen';
import ProfileScreen from '../../screens/profile/components/Profile';
import AppTabs from './AppTabs';
import { CallContext } from '../../screens/call/context/CallContext';
import { useNavigation } from '@react-navigation/native';
import { CallProvider } from '../../screens/call/context/CallProvider';
import { OutgoingCallScreen } from '../../screens/call/components/OutgoingCallScreen';
import { IncomingCallScreen } from '../../screens/call/components/IncomingCallScreen';
import { VoiceCallScreen } from '../../screens/call/components/VoiceCallScreen';
import { CallComingScreen } from '../../screens/call/components/CallComingScreen';
import { loginStyles } from '../../screens/login/components/Loginstyles';
import BlockedUsersScreen from '../../screens/profile/components/BlockedUsersScreen';
import SuspendedScreen from '../../../SuspendedScreen';
import PaywallScreen from '../../screens/profile/components/Paywall';
import PublicActivityFeed from '../../screens/activity-feed/components/ActivityFeedScreen';
import VerifySelfScreen from '../../screens/profile/components/VerifySelfScreen';
import UserProfile from '../../screens/activity-feed/components/UserProfile';
import UserFeedScreen from '../../screens/activity-feed/components/UserFeedScreen';
import ShareToChatScreen from '../../screens/activity-feed/components/ShareToChat';
import ChatListScreen from '../../screens/chat/components/Chat';
import ConnectFriendsScreen from '../../screens/login/components/ConnectFriendScreen';

  const AuthNavigator = () => {
    const [initialRoute, setInitialRoute] = useState<'Drawer' | 'AppTabs' | 'Login' | 'SavedAccounts' | null>(null);
    const authContext = useContext(AuthContext);

  

    useEffect(() => {
      const bootstrap = async () => {
        try {
          setSecretKey();
    
          // 1) Try restore session first
          const creds = await UserStorage.getUser();
          if (creds?.username) {
            const storedUser: UserLoginResponse = JSON.parse(creds.username);
            const accessToken =
              (await UserStorage.getAccessToken()) || storedUser.accessToken;

              const isIOS26Plus =
  Platform.OS === 'ios' &&
  parseInt(Platform.Version, 10) >= 26;
    
            if (accessToken && isIOS26Plus) {
              await setAuthHeaders(accessToken);
              authContext?.setUser?.(storedUser);
              setInitialRoute("AppTabs");
              return;
            }

            if (accessToken && !isIOS26Plus) {
              await setAuthHeaders(accessToken);
              authContext?.setUser?.(storedUser);
              setInitialRoute("Drawer");
              return;
            }

          }
    
          // 2) If no session, show SavedAccounts if any
          const saved = await SavedAccountsStorage.getAll();
          if (saved.length > 0) {
            setInitialRoute("SavedAccounts");
            return;
          }
    
          // 3) Otherwise Login
          await UserStorage.deleteUser();
          await UserStorage.clearTokens?.();
          setInitialRoute("Login");
        } catch (e) {
          await UserStorage.deleteUser();
          await UserStorage.clearTokens?.();
          setInitialRoute("Login");
        }
      };
    
      bootstrap();
    }, [authContext]);

  // Show splash while deciding where to go
  if (!initialRoute) {
   return null;
  }

return (
  <CallProvider>
      {/* 2. Drop the listener inside the Provider so it can access context */}
      
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationDuration: 200,
        }}
        initialRouteName={initialRoute}
      >
        
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="SavedAccounts" component={SavedAccountsScreen} />
        <Stack.Screen name="TwoFA" component={TwoFAScreen} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtp} />
        <Stack.Screen name="ConnectFriend" component={ConnectFriendsScreen} />
        <Stack.Screen name="ForgotPass" component={ForgotPass} />
        <Stack.Screen name="ResetPassVerifyOtp" component={ResetPassVerifyOTP} />
        <Stack.Screen name="SetPass" component={SetPassVerifiedOTP} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="MoodScreen" component={MoodScreen} />
        <Stack.Screen name="Drawer" component={DrawerNavigator} />
<Stack.Screen name="AppTabs" component={AppTabs} />
        <Stack.Screen name="ProofCamera" component={ProofVisionCameraScreen} />
        <Stack.Screen name="PublicActivityFeed" component={PublicActivityFeed} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Enable2FA" component={Enable2FAScreen} />
        <Stack.Screen name="Devices" component={DevicesScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="ReportProblem" component={ReportProblemScreen} />
        <Stack.Screen name="LegalPolicy" component={LegalPolicyScreen} />
        <Stack.Screen name="VerifySelf" component={VerifySelfScreen} />
        <Stack.Screen name="UserProfile" component={UserProfile} />
        <Stack.Screen name="UserFeedScreen" component={UserFeedScreen} />
        <Stack.Screen name="ShareToChat" component={ShareToChatScreen} />
        <Stack.Screen name="Chat" component={ChatListScreen}  options={{ unmountOnBlur: false, freezeOnBlur: true }} />

        <Stack.Screen name="AvatarCustomize" component={AvatarCustomizeScreen} />
        <Stack.Screen name="AvatarCreator" component={AvatarCreatorScreen} />

        <Stack.Screen
          name="chat"
          component={ChatScreen}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />

        <Stack.Screen
          name="NewChat"
          component={NewChatScreen}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />

        <Stack.Screen name="ArPortal" component={ARCameraView} />

        <Stack.Screen
          name="ProfilePreview"
          component={ProfilePreviewScreen}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />

        <Stack.Screen
          name="BlockedUsers"
          component={BlockedUsersScreen}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />

          <Stack.Screen
          name="SuspendedScreen"
          component={SuspendedScreen}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />

        <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />

        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />

        <Stack.Screen
          name="Friends"
          component={Friends}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />

          <Stack.Screen
          name="plus"
          component={PaywallScreen}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />

        <Stack.Screen
          name="FriendsManage"
          component={FriendsListScreen}
          options={{ unmountOnBlur: false, freezeOnBlur: true }}
        />
      </Stack.Navigator>
      </CallProvider>
);
};

export default AuthNavigator;