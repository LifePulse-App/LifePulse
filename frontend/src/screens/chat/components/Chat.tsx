import React, { useEffect, useState, useCallback, useContext } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";

import { fetchConversations, fetchFriends } from "../services/api_e2ee";
import { listConversationPreviews } from "../services/LocalConversationStore";

import MainLayout from "../../../shared/components/MainLayout";
import { getStableDeviceId } from "../../../shared/services/stableDeviceId";
import AuthContext from "../../../auth/user/UserContext";
import { getUnread, subscribeUnreadChanges } from '../services/ChatNotifications';
import { subscribeConversationChanges } from '../services/ChatNotifications';

const formatLastTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function ChatListScreen({ navigation }: any) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [offline, setOffline] = useState(false);
  const [unreadVersion, setUnreadVersion] = useState(0); // triggers reload
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Have we shown user any chat list?

  const user = useContext(AuthContext);
  const myUserId = user?.User?.user?.id;

  const loadFromCache = useCallback(async () => {
    if (!myUserId) return;

    const deviceId = await getStableDeviceId(myUserId);
    const previews = await listConversationPreviews(String(myUserId), String(deviceId));

    const cachedRows = previews.map((p: any) => ({
      peerUserId: String(p.peerUserId),
      peerName: p.peerName || "Friend",
      mood: p.mood || "",
      lastText: p.lastText ?? "",
      lastAt: p.lastAt ?? "",
      unread: getUnread(String(p.peerUserId)),
    }));

    cachedRows.sort(
      (a: any, b: any) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
    );

    setRows(cachedRows);

    if (cachedRows.length > 0) {
      setHasLoadedOnce(true);
      setInitialLoading(false);
    }
  }, [myUserId, unreadVersion]);

  // Initial mount: try cache, show immediately, then background update from server
  useEffect(() => {
    (async () => {
      await loadFromCache();
      await loadInBackground();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // For network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOffline =
        !state.isConnected || state.isInternetReachable === false;
      setOffline(isOffline);
    });

    return () => unsubscribe();
  }, []);

  // Load from server, never clears UI; only updates in background
  const loadInBackground = useCallback(async () => {
    try {
      if (!myUserId) return;

      // If offline, just show cache
      if (offline) return;

      const deviceId = await getStableDeviceId(myUserId);

      const { data } = await fetchConversations(deviceId);
      const serverConvos = data.conversations || [];

      const friendsRes = await fetchFriends();
      const friends = friendsRes?.data?.friends || [];
      const nameMap = new Map<string, string>();
      for (const f of friends) {
        nameMap.set(String(f._id), String(f.name || f.username || "Friend"));
      }

      const previews = await listConversationPreviews(String(myUserId), String(deviceId));
      const previewMap = new Map(previews.map((p) => [String(p.peerUserId), p]));

      const merged = serverConvos.map((c: any) => {
        const peerId = String(c._id);
        const p = previewMap.get(peerId);

        return {
          peerUserId: peerId,
          peerName: nameMap.get(peerId) || p?.peerName || "Friend",
          mood: c.mood || p?.mood || "",
          lastText: p?.lastText ?? "",
          lastAt: p?.lastAt ?? c?.lastMessage?.createdAt ?? "",
          unread: getUnread(peerId),
        };
      });

      merged.sort(
        (a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
      );

      setRows(merged);
      if (merged.length > 0) {
        setHasLoadedOnce(true);
        setInitialLoading(false);
      }
    } catch (e) {
      console.log("load convos error", e);
    }
  }, [myUserId, unreadVersion, offline]);

  // Reload from server/cache in background if needed, whenever relevant state triggers
  useEffect(() => {
    // loadFromCache runs immediately, and background updates in-place
    if (!hasLoadedOnce) {
      // Only show loader if not loaded anything
      setInitialLoading(true);
      loadFromCache().then(loadInBackground);
    } else {
      // Already have data, just update in background
      loadInBackground();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline, loadFromCache, loadInBackground]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      // On focus, never reset; just update in background
      loadInBackground();
    });
    return unsub;
  }, [navigation, loadInBackground]);

  useEffect(() => {
    // Subscribe to conversation/new message changes
    const unsub = subscribeConversationChanges(() => {
      setUnreadVersion((v) => v + 1);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubUnread = subscribeUnreadChanges(() => {
      setUnreadVersion((v) => v + 1);
    });
    return () => unsubUnread();
  }, []);

  const filtered = rows.filter((r) =>
    String(r.peerName || "").toLowerCase().includes(search.toLowerCase())
  );

  // Show loader only on cold start if NOTHING to show yet
  // if (initialLoading && !hasLoadedOnce) {
  //   return (
  //     <MainLayout>
  //       <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
  //         <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 32 }} />
  //         <Text style={{ color: "#fff", fontSize: 16, marginTop: 24 }}>Loading chats...</Text>
  //       </View>
  //     </MainLayout>
  //   );
  // }

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
              <Text style={[styles.netStatus, offline ? styles.netOffline : styles.netOnline]}>
                {offline ? "Connecting..." : "Online"}
              </Text>
            </View>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("NewChat")}>
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

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.peerUserId}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() =>
                  navigation.navigate("chat", {
                    peerUserId: item.peerUserId,
                    peerName: item.peerName,
                    peerMood: item.mood,
                  })
                }
              >
                <View style={styles.rowTop}>
                  <Text style={styles.peer} numberOfLines={1}>
                    {item.peerName}  {item.mood ? `[ is feeling ${item.mood} ] ` : ""}
                  </Text>
                  <Text style={styles.time}>{formatLastTime(item.lastAt)}</Text>
                </View>

                <View style={styles.rowTop}>
                  <Text style={styles.snippet} numberOfLines={1}>
                    {!item.lastAt
                      ? "No messages yet"
                      : item.unread > 0
                      ? "Sent you a message"
                      : "Opened message"}
                  </Text>
                  {item.unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText} numberOfLines={1}>
                        {item.unread > 99 ? '99+' : item.unread}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <Icon name="chat-outline" size={54} color="#334155" />
                <Text style={{ color: "#334155", fontWeight: "bold", fontSize: 18, marginTop: 18 }}>
                  No chats yet
                </Text>
              </View>
            }
          />
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
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  time: { color: "#94a3b8", fontSize: 12, marginLeft: 10 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  netStatus: { fontSize: 12, marginTop: 2 },
  netOnline: { color: "#22c55e" },
  netOffline: { color: "#f97316" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 10, marginBottom: 10, borderWidth: 1, borderColor: "rgba(148,163,184,0.3)" },
  searchInput: { flex: 1, color: "#fff", paddingVertical: 8, marginLeft: 6 },
  row: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12 },
  peer: { color: "#fff", fontSize: 16, fontWeight: "700" },
  snippet: { color: "#94a3b8", marginTop: 4 },
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