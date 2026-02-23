import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";

import MainLayout from "../../../shared/components/MainLayout";
import socialApi from "../services/api_friends";
import apiClient from "../../../auth/api-client/api_client";
import { Image } from "react-native";

const GLASS_BG = "rgba(15, 23, 42, 0.65)";
const GLASS_BORDER = "rgba(148, 163, 184, 0.35)";

const FRIENDS_CACHE_KEY = "friends:list:v1";

type Friend = {
  _id: string;
  name: string;
  username?: string;
  avatar?: any;
  since?: string;
};

const saveCache = async (friends: Friend[]) => {
  try {
    await AsyncStorage.setItem(
      FRIENDS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), friends })
    );
  } catch (e) {
    // ignore
  }
};

const loadCache = async (): Promise<Friend[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(FRIENDS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.friends ?? null;
  } catch {
    return null;
  }
};

export default function FriendsListScreen({ navigation }: any) {
  const [search, setSearch] = useState("");
  const [offline, setOffline] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const baseUrl = apiClient.getBaseURL(); // Example: "http://localhost:40000/api"
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  const didSeedFromCacheRef = useRef(false);

  // NetInfo
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true;
      const reachable = state.isInternetReachable === true; // null => false
      setOffline(!connected || !reachable);
    });
    return () => unsub();
  }, []);

  const seedFromCache = useCallback(async () => {
    const cached = await loadCache();
    if (cached && cached.length) {
      setFriends(cached);
      didSeedFromCacheRef.current = true;
    }
  }, []);

  const loadFriends = useCallback(async () => {
    setErrorMsg(null);

    // Always try cache first (instant fill)
    await seedFromCache();

    if (offline) {
      if (!didSeedFromCacheRef.current) {
        setErrorMsg("You are offline and no cached friends list is available yet.");
      }
      return;
    }

    setLoading(true);
    try {
      const res = await socialApi.getFriends();
      const list: Friend[] = res?.data?.friends || [];

      setFriends(list);
      await saveCache(list);
      didSeedFromCacheRef.current = true;
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load friends list.";

      // If we have nothing cached, show error. Otherwise keep cached list.
      const cached = await loadCache();
      if (!cached || cached.length === 0) {
        setErrorMsg(msg);
      } else {
        setErrorMsg("Showing cached friends list (network error).");
      }
    } finally {
      setLoading(false);
    }
  }, [offline, seedFromCache]);

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [loadFriends])
  );

  // Reload when connectivity changes
  useEffect(() => {
    loadFriends();
  }, [offline, loadFriends]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;

    return friends.filter((f) => {
      const name = String(f.name || "").toLowerCase();
      const username = String(f.username || "").toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [friends, search]);

  const renderFriend = ({ item }: { item: Friend }) => {
    console.log(item);
    
    const initials =
    item?.name?.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2) ||
    item?.username?.slice(0, 2)?.toUpperCase() ||
    "?";
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
        {item.avatar ? (
      <Image
        source={{ uri: newUrl + item.avatar }}
        style={{ width: 40, height: 40, borderRadius: 999 }}
        resizeMode="cover"
      />
    ) : (
      <Text style={styles.avatarText}>{initials}</Text>
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
  )}

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
            onPress={() => navigation.navigate("Friends")} // or your requests screen
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(99, 102, 241, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(191, 219, 254, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarLetter: { color: "#E5E7EB", fontWeight: "800" },
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
  avatarText: { color: "#0F172A", fontSize: 14, fontWeight: "700" },
});