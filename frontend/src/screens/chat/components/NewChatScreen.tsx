import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import MainLayout from "../../../shared/components/MainLayout";
import api from "../../friends/services/api_friends";
import apiClient from "../../../auth/api-client/api_client";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Friend = {
  _id: string;
  name: string;
  username?: string;
  avatar?: { url?: string } | string;
  avatarUrl?: string;
  avatarThumbnailUrl?: string;
};

const FRIENDS_CACHE_KEY = "chat:newChatFriends:v1";

export default function NewChatScreen({ navigation }: any) {
  const [q, setQ] = useState("");
  const [offline, setOffline] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  // --- Improved cache loading logic for offline-first experience ---
  useEffect(() => {
    (async () => {
      let cacheHit = false;
      try {
        const raw = await AsyncStorage.getItem(FRIENDS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.friends) {
            setFriends(parsed.friends);
            cacheHit = true;
            setLoading(false);
          }
        }
      } catch {}
      // Only call API if online
      if (!offline) {
        loadFriends();
      } else if (!cacheHit) {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsub();
  }, []);

  const loadFriends = useCallback(async () => {
    setLoading(true); // only needed for online fetch
    try {
      const res = await api.getFriends();
      const list = res?.data?.friends || [];
      setFriends(list);
      await AsyncStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify({ ts: Date.now(), friends: list }));
    } catch (e) {
      // never clear cache on error!
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = friends.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(q.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(q.toLowerCase())
  );

  const getAvatarUrl = (item: Friend) => {
    let raw =
      (typeof item.avatar === "string" ? item.avatar :
        item.avatar?.url) ||
      item.avatarUrl ||
      item.avatarThumbnailUrl ||
      "";
    return raw.startsWith("http") ? raw : newUrl + raw;
  };

  const renderAvatar = (item: Friend) => {
    const uri = getAvatarUrl(item);
    const hasError = !!imageErrorMap[item._id];

    if (uri && !hasError) {
      return (
        <Image
          source={{ uri }}
          style={styles.avatar}
          onError={() =>
            setImageErrorMap((prev) => ({
              ...prev,
              [item._id]: true,
            }))
          }
        />
      );
    }
    return (
      <View style={styles.avatarFallback}>
        <Icon name="account" size={22} color="#cbd5e1" />
      </View>
    );
  };

  return (
    <MainLayout>
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.title}>New Chat</Text>
              <Text style={[styles.netStatus, offline ? styles.netOffline : styles.netOnline]}>
                {offline ? "Connecting..." : "Online"}
              </Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("Chat")}>
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Icon name="magnify" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends"
              placeholderTextColor="#94a3b8"
              value={q}
              onChangeText={setQ}
            />
          </View>

          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate("chat", {
                      peerUserId: item._id,
                      peerName: item.name,
                      peerAvatarUrl: getAvatarUrl(item),
                    })
                  }
                >
                  {renderAvatar(item)}

                  <View style={styles.rowTextWrap}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.username ? (
                      <Text style={styles.sub} numberOfLines={1}>
                        @{item.username}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <Text style={{ color: "#94a3b8", textAlign: "center", marginTop: 12 }}>
                  No friends found.
                </Text>
              }
            />
          )}
        </View>
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
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  netStatus: { fontSize: 12, marginTop: 2 },
  netOnline: { color: "#22c55e" },
  netOffline: { color: "#f97316" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
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
  row: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  rowTextWrap: {
    flex: 1,
    marginLeft: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sub: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
});