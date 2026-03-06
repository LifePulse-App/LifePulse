import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Image,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

import MainLayout from "../../../shared/components/MainLayout";
import socialApi from "../services/api_friends";
import apiClient from "../../../auth/api-client/api_client";
import AuthContext from "../../../auth/user/UserContext";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";

const FRIENDS_CACHE_PREFIX = "friends:list:v2";

type Friend = {
  _id: string;
  name: string;
  username?: string;
  avatar?: any;
  avatarUrl?: string;
  avatarThumbnailUrl?: string;
  since?: string;
};

const saveCache = async (key: string, friends: Friend[]) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), friends }));
  } catch (e) {}
};

const loadCache = async (key: string): Promise<Friend[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // FIX 1: Check key existence rather than truthiness — an empty array [] is valid cache.
    return "friends" in parsed ? parsed.friends : null;
  } catch {
    return null;
  }
};

export default function FriendsListScreen({ navigation }: any) {
  const authContext = useContext(AuthContext);
  const currentUserId = String(authContext?.User?.user?.id || authContext?.User?.user?._id || "anon");
  const cacheKey = `${FRIENDS_CACHE_PREFIX}:${currentUserId}`;

  const [search, setSearch] = useState("");

  // FIX 2: Use a ref for offline status so loadFriends always reads the latest
  // value synchronously without a stale closure.
  const offlineRef = useRef(false);
  const [offline, setOffline] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  // FIX 3: Track mount so useFocusEffect doesn't double-fire with useEffect on first render.
  const hasMountedRef = useRef(false);

  // FIX 4: Populate offlineRef immediately on mount via NetInfo.fetch(),
  // not just on change events — so the very first loadFriends call has correct state.
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const isOffline = !(state.isConnected === true && state.isInternetReachable !== false);
      offlineRef.current = isOffline;
      setOffline(isOffline);
    });

    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !(state.isConnected === true && state.isInternetReachable !== false);
      offlineRef.current = isOffline;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  const loadFriends = useCallback(async () => {
    setErrorMsg(null);

    // FIX 5: Always load cache first, unconditionally — before any online/offline checks.
    // This guarantees cached data is shown immediately regardless of network state.
    const cached = await loadCache(cacheKey);
    if (cached) {
      setFriends(cached);
    }

    // FIX 6: Read offlineRef.current (synchronous) instead of offline state
    // to avoid stale closure where offline is still false on first call.
    if (offlineRef.current) {
      if (!cached) {
        setErrorMsg("You are offline and no cached friends list is available yet.");
      } else {
        setErrorMsg(null); // Cache loaded fine — no error needed.
      }
      return;
    }

    setLoading(true);
    try {
      const res = await socialApi.getFriends();
      const list: Friend[] = res?.data?.friends || [];

      // FIX 7: Guard against undefined/empty API response — don't overwrite good cache.
      if (!res?.data?.friends) {
        console.log("[FriendsList] API returned no friends data — keeping cache.");
        if (!cached) setErrorMsg("No friends data available right now.");
        setLoading(false);
        return;
      }

      setFriends(list);
      await saveCache(cacheKey, list);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load friends list.";
      // FIX 8: On error, keep the cache already set above — don't clear friends state.
      if (!cached) {
        setErrorMsg(msg);
      } else {
        setErrorMsg("Showing cached friends list (network error).");
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey]); // FIX 9: Removed `offline` and `seedFromCache` dependencies — using ref instead.

  // FIX 10: Single mount load via useEffect.
  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  // FIX 11: useFocusEffect only re-loads on subsequent focus events (not first mount),
  // preventing the double-fire race condition with the useEffect above.
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      loadFriends();
    }, [loadFriends])
  );

  // FIX 12: Re-run loadFriends when coming back online so live data replaces cache.
  // The offlineRef ensures loadFriends won't incorrectly block on a stale offline value.
  useEffect(() => {
    if (!offline) {
      loadFriends();
    }
  }, [offline]); // intentionally only triggers on offline toggle, not on loadFriends change

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const name = String(f.name || "").toLowerCase();
      const username = String(f.username || "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [friends, search]);

  const resolveAvatarUri = (item: Friend) => {
    const raw =
      item.avatarThumbnailUrl ||
      item.avatarUrl ||
      (typeof item.avatar === "string" ? item.avatar : item.avatar?.url) ||
      "";
    if (!raw) return "";
    return raw.startsWith("http") ? raw : newUrl + raw;
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const avatarUri = resolveAvatarUri(item);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() =>
          navigation.navigate("ProfilePreview", {
            userId: item._id,
            name: item.name,
            username: item.username,
          })
        }
      >
        <View style={styles.left}>
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={{ width: 40, height: 40, borderRadius: 999 }}
                resizeMode="cover"
              />
            ) : (
              <Icon name="account" size={20} color="#E5E7EB" />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.username} numberOfLines={1}>
              {item.username ? `@${item.username}` : "@"}
            </Text>
          </View>
        </View>

        <Icon name="chevron-right" size={22} color="#9CA3AF" />
      </TouchableOpacity>
    );
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
            <Text style={styles.title}>Friends</Text>
            <Text style={[styles.netStatus, offline ? styles.netOffline : styles.netOnline]}>
              {offline ? "Offline / Cached" : "Online"}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.iconGlass}
            onPress={() => navigation.navigate("Friends")}
          >
            <Icon name="account-plus-outline" size={22} color="#E5E7EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 6 }}>
              <Icon name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {errorMsg ? (
          <View style={styles.errorCard}>
            <Icon name="cloud-alert" size={20} color="#F87171" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.errorTitle}>Notice</Text>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
            <TouchableOpacity style={styles.errorRetryBtn} onPress={loadFriends} disabled={loading}>
              <Text style={styles.errorRetryText}>{loading ? "..." : "Retry"}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderFriend}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingBottom: 18 }}
          ListEmptyComponent={
            <View style={{ paddingTop: 30, alignItems: "center" }}>
              <Text style={{ color: "#94a3b8" }}>
                {loading ? "Loading..." : "No friends found"}
              </Text>
            </View>
          }
        />
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
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 12, marginTop: Platform.OS === "android" ? 4 : 8 },
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
  netStatus: { fontSize: 12, marginTop: 2 },
  netOnline: { color: "#22c55e" },
  netOffline: { color: "#f59e0b" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
  },
  searchInput: { flex: 1, color: "#fff", paddingVertical: 8, marginLeft: 6 },
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(99, 102, 241, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  name: { color: "#fff", fontSize: 16, fontWeight: "700" },
  username: { color: "#94a3b8", marginTop: 2 },
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