import React, { useEffect, useState, useCallback, useContext } from "react";
import { View, FlatList, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { listConversationPreviews as listConversationPreviewsApi, fetchFriends } from "../services/api_chat";

import MainLayout from "../../../shared/components/MainLayout";
import AuthContext from "../../../auth/user/UserContext";
import { getUnread, subscribeUnreadChanges, subscribeConversationChanges } from "../services/ChatNotifications";

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
  } catch {}
};

const loadCache = async (userId: string): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_KEY}:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export default function ChatListScreen({ navigation }: any) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [offline, setOffline] = useState(false);
  const [version, setVersion] = useState(0);

  const user = useContext(AuthContext);
  const myUserId = String(user?.User?.user?.id || user?.User?.user?._id || "");

  // Load cache immediately on mount for instant display
  useEffect(() => {
    if (!myUserId) return;
    loadCache(myUserId).then((cached) => {
      if (cached.length > 0) setRows(cached);
    });
  }, [myUserId]);

  const loadOnline = useCallback(async () => {
    if (!myUserId) return;

    try {
      const [{ data: convRes }, friendsRes] = await Promise.all([
        listConversationPreviewsApi(),
        fetchFriends(),
      ]);

      const friends = friendsRes?.data?.friends || [];
      const nameMap = new Map<string, string>();

      for (const f of friends) {
        const id = String(f._id);
        const name = String(f.name || f.username || "Friend");
        nameMap.set(id, name);
      }

      const convos = convRes?.conversations || [];
      const mapped = convos.map((c: any) => {
        const peerId = String(c.peerUserId);
        return {
          conversationId: String(c.conversationId),
          peerUserId: peerId,
          peerName: c.peerName || nameMap.get(peerId) || "Friend",
          mood: c.mood || "",
          lastText: c.lastText || "",
          lastAt: c.lastAt || "",
          unread: Number(c.unread ?? getUnread(peerId) ?? 0),
        };
      });

      mapped.sort(
        (a: any, b: any) =>
          new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
      );

      setRows(mapped);
      saveCache(myUserId, mapped); // persist for next time / offline
    } catch (e) {
      console.log("load list error — using cache", e);
      // cache already shown from the mount effect, nothing to do
    }
  }, [myUserId]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected || state.isInternetReachable === false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    loadOnline();
  }, [loadOnline, version]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadOnline);
    return unsub;
  }, [navigation, loadOnline]);

  useEffect(() => {
    const a = subscribeConversationChanges(() => setVersion((v) => v + 1));
    const b = subscribeUnreadChanges(() => setVersion((v) => v + 1));
    return () => {
      a();
      b();
    };
  }, []);

  const filtered = rows.filter((r) =>
    String(r.peerName || "").toLowerCase().includes(search.toLowerCase())
  );

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
                {offline ? "Offline" : "Online"}
              </Text>
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

          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.conversationId}:${item.peerUserId}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() =>
                  navigation.navigate("chat", {
                    conversationId: item.conversationId,
                    peerUserId: item.peerUserId,
                    peerName: item.peerName,
                    peerMood: item.mood,
                  })
                }
              >
                <View style={styles.rowTop}>
                  <Text style={styles.peer} numberOfLines={1}>
                    {item.peerName} {item.mood ? `[ is feeling ${item.mood} ]` : ""}
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
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        </View>
      </View>
    </MainLayout>
  );
}

// styles unchanged ...

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
  row: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12 },
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