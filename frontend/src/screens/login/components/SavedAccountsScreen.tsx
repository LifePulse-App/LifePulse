import React, { useEffect, useState, useContext } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Text } from "@rneui/themed";
import { CommonActions } from "@react-navigation/native";
import DeviceInfo from "react-native-device-info";

import SavedAccountsStorage, { SavedAccount } from "../../../auth/user/SavedAccountsStorage";
import AuthContext from "../../../auth/user/UserContext";
import api_Login from "../services/api_Login";
import { setAuthHeaders, setSecretKey } from "../../../auth/api-client/api_client";
import UserStorage from "../../../auth/user/UserStorage";
import { loginStyles } from "./Loginstyles";

const SavedAccountsScreen = ({ navigation }: any) => {
  const styles = loginStyles();
  const localStyles = savedStyles();
  const authContext = useContext(AuthContext);

  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = async () => {
    const list = await SavedAccountsStorage.getAll();
    setAccounts(list);
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogin = async (acc: SavedAccount) => {
    try {
      setLoadingId(acc.id);
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

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Drawer" }],
        })
      );
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    await SavedAccountsStorage.remove(id);
    await load();
  };

  return (
    <View style={styles.root}>
      <View style={styles.baseBackground} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.kbWrapper}>
        <View style={localStyles.header}>
          <Text style={localStyles.appName}>StreakSphere</Text>
          <Text style={localStyles.subTitle}>Saved Accounts</Text>
        </View>

        <View style={localStyles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {accounts.map((acc) => (
              <View key={acc.id} style={localStyles.accountRow}>
                <View style={localStyles.userInfo}>
                  <Text style={localStyles.username}>{acc.username}</Text>
                  <Text style={localStyles.smallText}>Tap login to continue</Text>
                </View>

                <View style={localStyles.rowActions}>
                  <TouchableOpacity
                    style={localStyles.loginBtn}
                    onPress={() => handleLogin(acc)}
                    disabled={loadingId === acc.id}
                  >
                    <Text style={localStyles.loginText}>
                      {loadingId === acc.id ? "Loading..." : "Login"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={localStyles.removeBtn}
                    onPress={() => handleRemove(acc.id)}
                  >
                    <Text style={localStyles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={localStyles.otherBtn}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={localStyles.otherText}>Use another account</Text>
          </TouchableOpacity>
        </View>
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
      color: "#A8FFF8",
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
      backgroundColor: "rgba(255,255,255,0.25)",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.35)",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    accountRow: {
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.35)",
      borderRadius: 10,
      padding: 14,
      marginBottom: 12,
    },
    userInfo: {
      marginBottom: 10,
    },
    username: {
      color: "white",
      fontWeight: "800",
      fontSize: 16,
    },
    smallText: {
      color: "white",
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
    otherBtn: {
      marginTop: 10,
      borderRadius: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.7)",
      alignItems: "center",
    },
    otherText: {
      color: "#E5E7EB",
      fontWeight: "700",
    },
  });