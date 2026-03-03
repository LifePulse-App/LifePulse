import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import DeviceInfo from "react-native-device-info";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import apiClient from "./src/auth/api-client/api_client";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";

export default function AppUpdateGate({ children }: any) {
  const [checking, setChecking] = useState(true);
  const [force, setForce] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("Update required");
  const [message, setMessage] = useState("Please update to continue.");

  useEffect(() => {
    (async () => {
      try {
        const currentVersion = DeviceInfo.getVersion();
        const platform = Platform.OS;
        
        const res = await apiClient.get(
          `/app/version?platform=${platform}&currentVersion=${currentVersion}`
        );
        const d = res?.data || {};
        if (d.force) {
          setForce(true);
          setUrl(d.updateUrl || "");
          setTitle(d.title || "Update required");
          setMessage(d.message || "Please update to continue.");
        }
      } catch {}
      finally {
        setChecking(false);
      }
    })();
  }, []);

  const onUpdate = async () => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch {}
  };

  if (checking) {
    return (
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#A855F7" />
        </View>
      </View>
    );
  }

  if (force) {
    return (
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.centerWrap}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <Icon name="update" size={28} color="#C4B5FD" />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <TouchableOpacity style={styles.updateBtn} onPress={onUpdate} activeOpacity={0.85}>
              <Icon name="open-in-new" size={18} color="#F9FAFB" />
              <Text style={styles.updateBtnText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: "rgba(168, 85, 247, 0.35)",
  },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  centerWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: GLASS_BG,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    padding: 20,
    alignItems: "center",
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(30, 64, 175, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: { color: "#F9FAFB", fontSize: 22, fontWeight: "700", textAlign: "center" },
  message: { color: "#CBD5E1", fontSize: 14, textAlign: "center", marginTop: 10, lineHeight: 20 },
  updateBtn: {
    marginTop: 18,
    minWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30, 64, 175, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.7)",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  updateBtnText: { color: "#F9FAFB", fontWeight: "700", fontSize: 15, marginLeft: 8 },
});