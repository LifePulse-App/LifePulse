import React, { useEffect, useState, useContext } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar, Image } from "react-native";
import { Text } from "@rneui/themed";
import { CommonActions } from "@react-navigation/native";
import DeviceInfo from "react-native-device-info";
import FastImage from "react-native-fast-image"; 
import Icon from "react-native-vector-icons/MaterialCommunityIcons"; // ⚡ IMPORTED ICON FOR FALLBACK

import SavedAccountsStorage, { SavedAccount } from "../../../auth/user/SavedAccountsStorage";
import AuthContext from "../../../auth/user/UserContext";
import api_Login from "../services/api_Login";
import { setAuthHeaders, setSecretKey } from "../../../auth/api-client/api_client";
import UserStorage from "../../../auth/user/UserStorage";
import { loginStyles } from "./Loginstyles";
import { connectSocket } from "../../../auth/api-client/socket";
import { getAvatar } from "../../../storage/AvatarManager";

interface SavedAccountWithAvatar extends SavedAccount {
  localAvatarUri?: string | null;
}

const SavedAccountsScreen = ({ navigation }: any) => {
  const styles = loginStyles();
  const localStyles = savedStyles();
  const authContext = useContext(AuthContext);

  const [accounts, setAccounts] = useState<SavedAccountWithAvatar[]>([]);
  
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"login" | "remove" | null>(null);

  const getUniqueByUsername = (list: SavedAccount[]) => {
    const seen = new Set<string>();
    const unique: SavedAccount[] = [];

    for (const acc of list) {
      const username = String(acc?.username || "").trim().toLowerCase();
      if (!username) continue;

      if (!seen.has(username)) {
        seen.add(username);
        unique.push(acc);
      }
    }

    return unique;
  };

  const load = async () => {
    const list = await SavedAccountsStorage.getAll();
    const unique = getUniqueByUsername(list);

    const accountsWithAvatars = await Promise.all(
      unique.map(async (acc) => {
        const rawUrl = acc?.user?.user?.avatarUrl || acc?.user?.user?.avatarThumbnailUrl || acc?.user?.user?.avatar || acc?.user?.user?.profile_picture;
        const userId = acc?.user?.user?._id || acc?.user?.user?.id || acc.id; 
        const avatarVersion = acc?.user?.user?.avatarVersion || 1;

        let localUri = null;
        if (rawUrl && rawUrl.trim() !== '' && rawUrl !== 'null' && rawUrl !== 'undefined') {
          localUri = await getAvatar(userId, rawUrl, avatarVersion);
        }

        return {
          ...acc,
          localAvatarUri: localUri, 
        };
      })
    );

    setAccounts(accountsWithAvatars);
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogin = async (acc: SavedAccount) => {
    try {
      setLoadingId(acc.id);
      setActionType("login");
      setSecretKey();

      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = await DeviceInfo.getDeviceName();
      const deviceModel = DeviceInfo.getModel();
      const deviceBrand = DeviceInfo.getBrand();

      const res = await api_Login.getLogin(
        acc.username,
        acc.password,
        deviceId,
        deviceName,
        deviceModel,
        deviceBrand
      );

      if (!res.ok) {
        await SavedAccountsStorage.remove(acc.id);
        await load();
        return;
      }

      const user = res.data;
      user.UserName = acc.username;
      user.Password = acc.password;

      setAuthHeaders(user.accessToken);
      authContext?.setUser(user);
      await UserStorage.setUser(user);
      if (user.accessToken) await UserStorage.setAccessToken(user.accessToken);
      if (user.refreshToken) await UserStorage.setRefreshToken(user.refreshToken);

      await connectSocket();

      const isIOS26Plus = Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 26;
      if (isIOS26Plus) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'AppTabs' }],
          }),
        );
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Drawer' }],
          }),
        );
      }
    } finally {
      setLoadingId(null);
      setActionType(null);
    }
  };

  const handleRemove = async (acc: SavedAccount) => {
    try {
      setLoadingId(acc.id); 
      setActionType("remove"); 
      const deviceId = await DeviceInfo.getUniqueId();

      const res = await api_Login.getLogin(
        acc.username,
        acc.password,
        deviceId
      );

      if (res.ok && res.data?.accessToken) {
        setAuthHeaders(res.data.accessToken);
        await api_Login.logoutDevice(deviceId); 
        setAuthHeaders(null);
      }
    } catch (error) {
      console.log("Failed to remove device from backend:", error);
    } finally {
      await SavedAccountsStorage.remove(acc.id);
      await load();
      setLoadingId(null);
      setActionType(null);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.baseBackground} />
       <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

      <View style={styles.kbWrapper}>
        <View style={localStyles.header}>
          <Image 
            source={require('../../../shared/bootsplash/logo-bg.png')}
            style={{ width: 180, height: 100, alignSelf: 'center', marginBottom: 0 }}
            resizeMode="contain"
          />
          <Text style={localStyles.appName}>StreakSphere</Text>
          <Text style={localStyles.subTitle}>Saved Accounts</Text>
        </View>

        <View style={localStyles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {accounts.map((acc) => {
              const isThisLoading = loadingId === acc.id;
              const displayName = acc?.user?.user?.name || acc.username || "User";
              
              const avatarVersion = acc?.user?.user?.avatarVersion || 1;
              const finalAvatarUri = acc.avatarUrl? acc.avatarUrl : null;

              return (
                <View key={acc.id} style={localStyles.accountRow}>
                  
                  <View style={localStyles.accountHeader}>
                    {/* ⚡ UPDATED: Check if finalAvatarUri exists, else show grey person icon */}
                    {finalAvatarUri ? (
                      <FastImage
                        style={localStyles.avatar}
                        source={{
                          uri: finalAvatarUri,
                          priority: FastImage.priority.high,
                        }}
                        resizeMode={FastImage.resizeMode.cover}
                      />
                    ) : (
                      <View style={localStyles.avatarFallback}>
                        <Icon name="account" size={32} color="#94a3b8" />
                      </View>
                    )}
                    
                    <View style={localStyles.userInfo}>
                      <Text style={localStyles.username}>{displayName}</Text>
                      <Text style={localStyles.smallText}>Tap login to continue</Text>
                    </View>
                  </View>

                  <View style={localStyles.rowActions}>
                    <TouchableOpacity
                      style={localStyles.loginBtn}
                      onPress={() => handleLogin(acc)}
                      disabled={isThisLoading}
                    >
                      <Text style={localStyles.loginText}>
                        {isThisLoading && actionType === "login" ? "Loading..." : "Login"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={localStyles.removeBtn}
                      onPress={() => handleRemove(acc)}
                      disabled={isThisLoading}
                    >
                      <Text style={localStyles.removeText}>
                        {isThisLoading && actionType === "remove" ? "Removing..." : "Remove"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
      
      <View style={{ 
            paddingVertical: 20, 
            paddingBottom: Platform.OS === 'ios' ? 40 : 40, 
            alignItems: 'center',
            borderTopWidth: 0.5,
            borderTopColor: 'rgba(255, 255, 255, 0.1)' 
        }}>
          <Text style={{ color: '#c7cbcf', fontSize: 13 }}>
            Log in to another account?{' '}
            <Text
              style={{ fontWeight: '700', color: '#fff' }}
              onPress={() => navigation.navigate('Login')}
            >
              Login
            </Text>
          </Text>
        </View>
    </View>
  );
};

export default SavedAccountsScreen;

const savedStyles = () =>
  StyleSheet.create({
    header: {
      alignItems: "center",
      marginBottom: 18,
    },
    appName: {
      fontSize: 30,
      fontWeight: "800",
      color: "#f9f9f9",
    },
    subTitle: {
      color: "#9CA3AF",
      fontSize: 14,
      marginTop: 4,
    },
    card: {
      width: "100%",
      borderRadius: 24,
      padding: 18,
      backgroundColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,1)",
      shadowColor: "#000",
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      maxHeight: '80%', 
    },
    accountRow: {
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.35)",
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
    },
    accountHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#1a1a1a', 
      marginRight: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      overflow: 'hidden' 
    },
    // ⚡ ADDED: Fallback style for the grey person icon
    avatarFallback: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#1e293b', // Slate 800 (Dark Grey/Blue)
      marginRight: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    userInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    username: {
      color: "white",
      fontWeight: "800",
      fontSize: 16,
    },
    smallText: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 12,
      marginTop: 2,
    },
    rowActions: {
      flexDirection: "row",
      gap: 8,
    },
    loginBtn: {
      flex: 1,
      backgroundColor: "#000",
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
    },
    loginText: {
      color: "#fff",
      fontWeight: "700",
    },
    removeBtn: {
      flex: 1,
      backgroundColor: "#ef4444",
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
    },
    removeText: {
      color: "#fff",
      fontWeight: "700",
    },
  });