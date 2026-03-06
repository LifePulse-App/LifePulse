import React, { useEffect, useState, useCallback, useContext } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator } from "react-native";
import { Text } from "@rneui/themed";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { listConversationPreviews as listConversationPreviewsApi, fetchFriends } from "../services/api_chat";

import MainLayout from "../../../shared/components/MainLayout";
import AuthContext from "../../../auth/user/UserContext";
import { getUnread, subscribeUnreadChanges, subscribeConversationChanges } from "../services/ChatNotifications";
import apiClient from "../../../auth/api-client/api_client";

const CACHE_KEY = "chat_list_cache";

const formatLastTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const saveCache = async (userId: string, data: any[]) => {
  try {
    await AsyncStorage.setItem(`${CACHE_KEY}:${userId}`, JSON.stringify(data));
  } catch (err) {
    console.log('Cache save error', err);
  }
};

const loadCache = async (userId: string): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.log('Cache load error', err);
    return [];
  }
};

const baseUrl = apiClient.getBaseURL();
const newUrl = baseUrl.replace(/\/api\/?$/, "");

const Avatar = ({ url }: { url?: string }) => {
  if (url) {
    return (
      <Image
        source={{ uri: newUrl + url }}
        style={styles.avatar}
      />
    );
  } else {
    return (
      <View style={styles.avatarFallback}>
        <Icon name="account" size={22} color="#cbd5e1" />
      </View>
    );
  }
};

export default function ChatListScreen({ navigation }: any) {
  // State for context reload
  const [myUserId, setMyUserId] = useState("");
  const [userLoaded, setUserLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [offline, setOffline] = useState(false);
  const [version, setVersion] = useState(0);
  const [loadingCache, setLoadingCache] = useState(true);
  const [loadingApi, setLoadingApi] = useState(false);

  const user = useContext(AuthContext);

  // Track user id from context more robustly
  useEffect(() => {
    let resolvedId = "";
    if (user?.User?.user?.id) resolvedId = String(user?.User?.user?.id);
    else if (user?.User?.user?._id) resolvedId = String(user?.User?.user?._id);
    setMyUserId(resolvedId);
    setUserLoaded(!!resolvedId);
  }, [user]);

  // Load cache immediately when userId is set
  useEffect(() => {
    if (!myUserId) {
      setLoadingCache(false);
      return;
    }
    setLoadingCache(true);
    loadCache(myUserId).then((cached) => {
      setRows(cached || []); // always set cached value (even empty)
      setLoadingCache(false);
    });
  }, [myUserId]);

  // Online API fetch: only if userId available and not offline
  const loadOnline = useCallback(async () => {
    if (!myUserId || offline) return;
    setLoadingApi(true);

    try {
      const [{ data: convRes }, friendsRes] = await Promise.all([
        listConversationPreviewsApi(),
        fetchFriends(),
      ]);

      // Defensive: if either fails, throw
      if (!convRes?.conversations || !Array.isArray(convRes.conversations)) {
        throw new Error("Failed to load conversations");
      }
      if (!friendsRes?.data?.friends || !Array.isArray(friendsRes.data.friends)) {
        throw new Error("Failed to load friends");
      }

      const friends = friendsRes?.data?.friends || [];
      const friendMap = new Map<
        string,
        { name: string; avatarUrl: string; avatarThumb: string; avatarPublicUrl: string }
      >();

      for (const f of friends) {
        const id = String(f._id);
        friendMap.set(id, {
          name: String(f.name || f.username || "Friend"),
          avatarUrl: String(f.avatar || ""),
          avatarThumb: String(f.avatarThumbnailUrl || ""),
          avatarPublicUrl: String(f.avatar?.url || ""),
        });
      }

      const convos = convRes?.conversations || [];
      const mapped = convos.map((c: any) => {
        const peerId = String(c.peerUserId);
        const friend = friendMap.get(peerId);

        const resolvedAvatar = friend?.avatarUrl || "";

        return {
          conversationId: String(c.conversationId),
          peerUserId: peerId,
          peerName: c.peerName || friend?.name || "Friend",
          peerAvatarUrl: String(resolvedAvatar || ""),
          mood: c.mood || "",
          lastText: c.lastText || "",
          lastAt: c.lastAt || "",
          unread: Number(getUnread(peerId) || c.unread || 0),
        };
      });

      mapped.sort(
        (a: any, b: any) =>
          new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
      );

      // Only setRows and saveCache if mapped has results.
      if (mapped.length > 0) {
        setRows(mapped);
        await saveCache(myUserId, mapped);
        console.log('API loaded, rows:', mapped.length);
      } else {
        // If API returns empty but cache exists, don't overwrite cache!
        console.log('API returned empty list — cache not overwritten.');
      }
      setLoadingApi(false);

    } catch (e) {
      setLoadingApi(false);
      console.log("load list error — using cache", e);
      // DO NOT overwrite cache or setRows([])
    }
  }, [myUserId, offline]);

  // Always track network status
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected || state.isInternetReachable === false);
      console.log('Network status changed:', state.isConnected, state.isInternetReachable);
    });
    return () => unsub();
  }, []);

  // API fetch triggers on version change
  useEffect(() => {
    if (myUserId && !offline) loadOnline();
  }, [loadOnline, version, myUserId, offline]);

  // Navigation focus: reload cache and try API fetch
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (!myUserId) return;
      loadCache(myUserId).then((cached) => {
        setRows(cached || []); // always restore cache on focus
        setLoadingCache(false);
      });
      loadOnline();
      console.log('Navigation focus event triggered.');
    });
    return unsub;
  }, [navigation, loadOnline, myUserId]);

  // Every time screen gets focus (react navigation)
  useFocusEffect(
    useCallback(() => {
      if (!myUserId) return;
      loadCache(myUserId).then((cached) => {
        setRows(cached || []);
        setLoadingCache(false);
        console.log('Screen focus: Cache restored');
      });
    }, [myUserId])
  );

  // Subscribe changes: force refresh
  useEffect(() => {
    const a = subscribeConversationChanges(() => setVersion((v) => v + 1));
    const b = subscribeUnreadChanges(() => setVersion((v) => v + 1));
    return () => {
      a();
      b();
    };
  }, []);

  // Filter for search
  const filtered = rows.filter((r) =>
    String(r.peerName || "").toLowerCase().includes(search.toLowerCase())
  );

  // Loading UI
  if (!userLoaded || loadingCache) {
    return (
      <MainLayout>
        <View style={styles.root}>
          <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 80 }} />
          <Text style={{ color: "#fff", textAlign: "center", marginTop: 18 }}>Loading your cached chats...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={{ flex: 1 }}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.title}>Chats</Text>
            </View>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("NewChat")}
            >
              <Icon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Icon name="magnify" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {(loadingApi && !filtered.length) ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#6366f1" size="large" />
              <Text style={{ color: "#fff", marginTop: 12 }}>Fetching latest chats...</Text>
            </View>
          ) :
          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.conversationId}:${item.peerUserId}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() =>
                  navigation.navigate("chat", {
                    conversationId: item.conversationId,
                    peerUserId: item.peerUserId,
                    peerName: item.peerName,
                    peerMood: item.mood,
                    peerAvatarUrl: item.peerAvatarUrl,
                  })
                }
              >
                <Avatar url={item.peerAvatarUrl} />

                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text style={styles.peer} numberOfLines={1}>
                      {item.peerName}
                    </Text>
                    <Text style={styles.time}>{formatLastTime(item.lastAt)}</Text>
                  </View>

                  <View style={styles.rowTop}>
                    <Text style={styles.snippet} numberOfLines={1}>
                      {item.lastText || "No messages yet"}
                    </Text>
                    {item.unread > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText} numberOfLines={1}>
                          {item.unread > 99 ? "99+" : item.unread}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />}
        </View>
      </View>
    </MainLayout>
  );
}

// Styles (same as yours)
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

  row: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  rowContent: { flex: 1, marginLeft: 10 },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },

  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  time: { color: "#94a3b8", fontSize: 12, marginLeft: 10 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
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

  peer: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  snippet: { color: "#94a3b8", marginTop: 4, flex: 1, marginRight: 8 },
  badge: {
    marginLeft: 8,
    backgroundColor: "#f43f5e",
    borderRadius: 12,
    minWidth: 22,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
    includeFontPadding: false,
  },
});