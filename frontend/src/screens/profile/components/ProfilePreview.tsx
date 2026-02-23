import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Modal, // Add Modal from react-native
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import MainLayout from "../../../shared/components/MainLayout";
import socialApi from "../../friends/services/api_friends";
import apiClient from "../../../auth/api-client/api_client";
import { Image } from "react-native";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";

type Props = {
  navigation: any;
  route: { params?: { userId: string; name?: string; username?: string } };
};

type PreviewUser = {
  _id: string;
  name: string;
  username?: string;
  level?: number;
  title?: string;
  mood?: string;
  country?: string;
  city?: string;
  avatarUrl: string;
  isPublic?: boolean;
  canSeeLocation?: boolean;
};

type Friendship = {
  isFriend: boolean;
  requestSent: boolean;
  requestIncoming: boolean;
};

type PreviewResponse = {
  user: PreviewUser;
  friendship: Friendship;
};

const cacheKey = (userId: string) => `profilePreview:v2:${userId}`;

const saveCache = async (key: string, value: PreviewResponse) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch {}
};

const loadCache = async (key: string): Promise<PreviewResponse | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.value ?? null;
  } catch {
    return null;
  }
};

// Preview avatar modal styles
const previewStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  centered: { alignItems: "center" },
  previewImg: {
    width: 330,
    height: 330,
    borderRadius: 250,
    marginVertical: 20,
  },
  closeHint: {
    color: "#94a3b8",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 12,
  },
});

export default function ProfilePreviewScreen({ navigation, route }: Props) {
  const userId = route.params?.userId;
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const [user, setUser] = useState<PreviewUser | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [avatarPreviewVisible, setAvatarPreviewVisible] = useState(false); // <--- HERE!

  const baseUrl = apiClient.getBaseURL(); // Example: "http://localhost:40000/api"
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  // connectivity
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true;
      const reachable = state.isInternetReachable === true; // null => false
      setOffline(!connected || !reachable);
    });
    return () => unsub();
  }, []);

  const seedFromRoute = useCallback(() => {
    if (!userId) return;
    setUser((prev) => ({
      _id: userId,
      name: prev?.name || route.params?.name || "User",
      username: prev?.username || route.params?.username || "",
      level: prev?.level,
      title: prev?.title,
      mood: prev?.mood,
      country: prev?.country,
      city: prev?.city,
      avatarUrl: prev?.avatarUrl,
      isPublic: prev?.isPublic,
      canSeeLocation: prev?.canSeeLocation,
    }));
  }, [userId, route.params?.name, route.params?.username]);

  const load = useCallback(async () => {
    if (!userId) return;

    setErrorMsg(null);
    seedFromRoute();

    // 1) cache-first
    const cached = await loadCache(cacheKey(userId));
    if (cached) {
      setUser(cached.user);
      setFriendship(cached.friendship);
    }

    // 2) offline => stop
    if (offline) return;

    // 3) live
    setLoading(true);
    try {
      // requires backend endpoint: GET /friends/preview/:userId
      const res = await (socialApi as any).previewProfile(userId);
      const payload: PreviewResponse = res?.data;

      // Merge route name/username if backend doesn't provide for some reason
      const mergedUser: PreviewUser = {
        ...payload.user,
        _id: userId,
        name: payload.user?.name || route.params?.name || "User",
        username: payload.user?.username || route.params?.username || "",
      };

      setUser(mergedUser);
      setFriendship(payload.friendship);

      await saveCache(cacheKey(userId), { user: mergedUser, friendship: payload.friendship });
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || "Failed to load user preview.");
    } finally {
      setLoading(false);
    }
  }, [userId, offline, seedFromRoute, route.params?.name, route.params?.username]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const initials = useMemo(() => {
    const n = user?.name || "";
    return (n.trim().slice(0, 1) || "U").toUpperCase();
  }, [user?.name]);

  const locationText = useMemo(() => {
    if (user?.canSeeLocation === false) return "Hidden";
    const country = user?.country?.trim();
    const city = user?.city?.trim();
    if (country && city) return `${city}, ${country}`;
    if (country) return country;
    if (city) return city;
    return "—";
  }, [user?.country, user?.city, user?.canSeeLocation]);

  const actionLabel =
    friendship?.isFriend
      ? "Unfriend"
      : friendship?.requestIncoming
        ? "Accept"
        : friendship?.requestSent
          ? "Requested"
          : "Add Friend";

  const actionDisabled = busyAction || loading || offline || actionLabel === "Requested";

  const onPressAction = async () => {
    if (!userId || !friendship) return;
    if (offline) {
      Alert.alert("Offline", "You are offline. Please connect to the internet to perform this action.");
      return;
    }

    try {
      setBusyAction(true);

      if (friendship.isFriend) {
        await (socialApi as any).unfriend(userId);
      } else if (friendship.requestIncoming) {
        await (socialApi as any).acceptFriendRequest(userId);
      } else if (friendship.requestSent) {
        return;
      } else {
        await (socialApi as any).sendFriendRequest(userId);
      }

      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to perform action.");
    } finally {
      setBusyAction(false);
    }
  };

  const onPressCancelRequest = async () => {
    if (!userId) return;
    if (offline) {
      Alert.alert("Offline", "You are offline. Please connect to cancel the request.");
      return;
    }

    try {
      setBusyAction(true);
      await (socialApi as any).removeFriendRequest(userId);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to cancel request.");
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <MainLayout>
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.iconGlass}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={22} color="#E5E7EB" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.title}>Profile</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.iconGlass}
            onPress={load}
          >
            <Icon name="refresh" size={20} color="#E5E7EB" />
          </TouchableOpacity>
        </View>

        {/* Error card */}
        {errorMsg ? (
          <View style={styles.errorCard}>
            <Icon name="cloud-alert" size={20} color="#F87171" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.errorTitle}>Notice</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
            <TouchableOpacity style={styles.errorRetryBtn} onPress={load}>
              <Text style={styles.errorRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Main card */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.avatarCircle}>
              {user?.avatarUrl ? (
                <TouchableOpacity
                  onPress={() => setAvatarPreviewVisible(true)}
                  activeOpacity={0.92}
                >
                  <Image
                    source={{
                      uri: user.avatarUrl.startsWith("http")
                        ? user.avatarUrl
                        : newUrl + user.avatarUrl,
                    }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <Text style={styles.avatarLetter}>{initials}</Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {user?.name || "User"}
              </Text>
              <Text style={styles.username} numberOfLines={1}>
                {user?.username ? `@${user.username}` : "@"}
              </Text>
            </View>

            {loading ? <ActivityIndicator color="#A855F7" /> : null}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.pill}>
              <Icon name="star-outline" size={16} color="#C4B5FD" />
              <Text style={styles.pillText}>
                Level: {typeof user?.level === "number" ? user.level : "—"}
              </Text>
            </View>

            <View style={styles.pill}>
              <Icon name="crown-outline" size={16} color="#FDBA74" />
              <Text style={styles.pillText}>
                Title: {user?.title ? user.title : "—"}
              </Text>
            </View>

            <View style={styles.pill}>
              <Icon name="map-marker-outline" size={16} color="#60A5FA" />
              <Text style={styles.pillText} numberOfLines={1}>
                Location: {locationText}
              </Text>
            </View>

            <View style={styles.pill}>
              <Icon name="emoticon-outline" size={16} color="#34D399" />
              <Text style={styles.pillText}>
                Mood: {user?.mood ? user.mood : "—"}
              </Text>
            </View>
          </View>

          {/* Friend actions */}
          <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.actionBtn,
                friendship?.isFriend && { borderColor: "rgba(248,113,113,0.6)" },
                friendship?.requestIncoming && { borderColor: "rgba(34,197,94,0.6)" },
                friendship?.requestSent && { opacity: 0.7 },
                offline && { opacity: 0.6 },
              ]}
              onPress={onPressAction}
              disabled={actionDisabled}
            >
              <Text style={styles.actionBtnText}>
                {busyAction ? "Please wait..." : actionLabel}
              </Text>
            </TouchableOpacity>

            {/* Optional cancel button when Requested */}
            {friendship?.requestSent && (
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.actionBtn,
                  { borderColor: "rgba(148,163,184,0.5)" },
                  offline && { opacity: 0.6 },
                ]}
                onPress={onPressCancelRequest}
                disabled={busyAction || loading || offline}
              >
                <Text style={styles.actionBtnText}>
                  {busyAction ? "..." : "Cancel"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {offline ? (
            <Text style={styles.hint}>
              You’re offline. Showing cached data; friend actions are disabled.
            </Text>
          ) : null}
        </View>

        {/* Avatar preview modal */}
        <Modal
          visible={avatarPreviewVisible && !!user?.avatarUrl}
          transparent
          onRequestClose={() => setAvatarPreviewVisible(false)}
        >
          <View style={previewStyles.overlay}>
            <TouchableOpacity
              style={previewStyles.overlay}
              activeOpacity={1}
              onPress={() => setAvatarPreviewVisible(false)}
            >
              <View style={previewStyles.centered}>
                <Image
                  source={{
                    uri: user?.avatarUrl?.startsWith("http")
                      ? user?.avatarUrl
                      : newUrl + user?.avatarUrl,
                  }}
                  style={previewStyles.previewImg}
                />
              </View>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </MainLayout>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a", padding: 12 },
  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(59, 130, 246, 0.28)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(168, 85, 247, 0.28)",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: Platform.OS === "android" ? 4 : 8,
  },
  iconGlass: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.0)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },

  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  headerRow: { flexDirection: "row", alignItems: "center" },

  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(99, 102, 241, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarLetter: { color: "#E5E7EB", fontWeight: "800", fontSize: 18 },

  name: { color: "#fff", fontSize: 18, fontWeight: "800" },
  username: { color: "#94a3b8", marginTop: 2 },

  infoGrid: { marginTop: 14, gap: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  pillText: { color: "#E5E7EB", fontWeight: "700" },

  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { color: "#E5E7EB", fontWeight: "800" },

  hint: {
    marginTop: 12,
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 16,
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(127, 29, 29, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.45)",
    marginBottom: 10,
  },
  errorTitle: { color: "#FCA5A5", fontSize: 13, fontWeight: "700", marginBottom: 2 },
  errorText: { color: "#FEE2E2", fontSize: 11 },
  errorRetryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248, 250, 252, 0.5)",
    marginLeft: 8,
  },
  errorRetryText: { color: "#FEF2F2", fontSize: 11, fontWeight: "600" },
});