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

function semverCompare(a: string, b: string): number {
  // Returns <0 if a < b, 0 if a == b, >0 if a > b
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const ai = pa[i] || 0, bi = pb[i] || 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

export default function AppUpdateGate({ children }: any) {
  const [checking, setChecking] = useState(true);
  const [force, setForce] = useState(false);
  const [recommend, setRecommend] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("Update required");
  const [message, setMessage] = useState("Please update to continue.");

  useEffect(() => {
    (async () => {
      try {
        const currentVersion = DeviceInfo.getVersion();
        const platform = Platform.OS;

        console.log(currentVersion, platform);
        

        const res = await apiClient.get(
          `/app/version?platform=${platform}&currentVersion=${currentVersion}`
        );
        const d = res?.data || {};

        console.log(d);
        

        // Defaults if not available
        const minSupported = d.minSupported || d.min_version || "0.0.0";
        const latest = d.latest || d.latest_version || "0.0.0";

        const belowMin = semverCompare(currentVersion, minSupported) < 0;
        const belowLatest = semverCompare(currentVersion, latest) < 0;

        // If below minSupported: force update, gate app
        if (belowMin) {
          setForce(true);
          setUrl(d.updateUrl || "");
          setTitle(d.title || "Update required");
          setMessage(
            d.message ||
              "Your version is no longer supported. Please update to continue."
          );
        }
        // If below latest: recommend update, let user continue
        else if (belowLatest) {
          setRecommend(true);
          setUrl(d.updateUrl || "");
          setTitle(
            d.title ||
              "Update available"
          );
          setMessage(
            d.message ||
              "There's a new update. For best experience, please update your app."
          );
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

  // Loading
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

  // Force update - gate app entirely
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

  // Recommend update - allow continue
  if (recommend) {
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

            <TouchableOpacity
              style={styles.laterBtn}
              onPress={() => setRecommend(false)} // Continue to app
              activeOpacity={0.85}
            >
              <Text style={styles.laterBtnText}>Continue without updating</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Otherwise, normal experience
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
  laterBtn: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderColor: "rgba(191, 219, 254, 0.35)",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  laterBtnText: { color: "#F9FAFB", fontWeight: "600", fontSize: 15 },
});