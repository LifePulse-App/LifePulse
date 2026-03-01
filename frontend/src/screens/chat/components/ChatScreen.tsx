import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  LayoutAnimation,
  TouchableWithoutFeedback,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { v4 as uuidv4 } from "uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AuthContext from "../../../auth/user/UserContext";
import {
  openDirectConversation,
  sendMessage,
  fetchThread,
  markDelivered,
  markSeen,
} from "../services/api_chat";
import {
  clearUnread,
  setActiveChatPeer,
  notifyConversationChanged,
} from "../services/ChatNotifications";

type Item =
  | { type: "date"; id: string; dateKey: string }
  | { type: "msg"; id: string; msg: any };

const CHAT_CACHE_PREFIX = "chat_messages_cache";

const saveChatCache = async (conversationId: string, msgs: any[]) => {
  try {
    await AsyncStorage.setItem(`${CHAT_CACHE_PREFIX}:${conversationId}`, JSON.stringify(msgs));
  } catch {}
};

const loadChatCache = async (conversationId: string): Promise<any[]> => {
  try {
    const raw = await AsyncStorage.getItem(`${CHAT_CACHE_PREFIX}:${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const dateKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

const formatDateHeader = (yyyyMmDd: string) => {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, y)) return "Yesterday";
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ChatScreen({ route, navigation }: any) {
  const user = useContext(AuthContext);
  const { peerUserId, peerName, peerMood } = route.params;
  const insets = useSafeAreaInsets();

  const myUserId = user?.User?.user?.id;

  const [conversationId, setConversationId] = useState<string | null>(
    route?.params?.conversationId || null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [offline, setOffline] = useState(false);

  const flatRef = useRef<FlatList>(null);
  const scrollToBottom = () =>
    requestAnimationFrame(() => flatRef.current?.scrollToEnd({ animated: true }));

  const normalizeServer = useCallback(
    (serverMsgs: any[]) => {
      return serverMsgs
        .map((m: any) => {
          const isMe = String(m.senderId) === String(myUserId);
          let tickState = "pending";

          if (isMe) {
            if (m.seenAt) tickState = "seen";
            else if (m.deliveredAt) tickState = "delivered";
            else tickState = "sent";
          } else {
            tickState = "delivered";
          }

          return {
            _id: String(m._id),
            fromUserId: String(m.senderId),
            toUserId: String(m.receiverId),
            plaintext: String(m.text || ""),
            createdAt: m.createdAt,
            clientMessageId: m.clientMessageId,
            seenAt: m.seenAt || null,
            deliveredAt: m.deliveredAt || null,
            tickState,
          };
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    },
    [myUserId]
  );

  const buildItemsWithDateSeparators = useCallback((msgs: any[]): Item[] => {
    const out: Item[] = [];
    let lastDate = "";

    for (const m of msgs) {
      const dk = dateKey(m.createdAt);
      if (dk !== lastDate) {
        lastDate = dk;
        out.push({ type: "date", id: `date-${dk}`, dateKey: dk });
      }
      out.push({ type: "msg", id: `msg-${m._id}`, msg: m });
    }

    return out;
  }, []);

  // Load cache immediately when conversationId is known
  useEffect(() => {
    if (!conversationId) return;
    loadChatCache(conversationId).then((cached) => {
      if (cached.length > 0) {
        setMessages(cached);
        setTimeout(scrollToBottom, 50);
      }
    });
  }, [conversationId]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected || state.isInternetReachable === false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTimeout(scrollToBottom, 80);
    });
    return () => show.remove();
  }, []);

  useEffect(() => {
    setActiveChatPeer(String(peerUserId));
    clearUnread(String(peerUserId));
    return () => setActiveChatPeer(null);
  }, [peerUserId]);

  useEffect(() => {
    setItems(buildItemsWithDateSeparators(messages));
  }, [messages, buildItemsWithDateSeparators]);

  useEffect(() => {
    (async () => {
      if (conversationId) return;
      const { data } = await openDirectConversation(String(peerUserId));
      const cid = data?.conversation?._id;
      if (cid) setConversationId(String(cid));
    })();
  }, [peerUserId, conversationId]);

  const loadThread = useCallback(async () => {
    if (!conversationId || !myUserId || offline) return;

    try {
      const { data } = await fetchThread(String(conversationId), { limit: 200 });
      const serverMsgs = data?.messages || [];

      const normalized = normalizeServer(serverMsgs);
      setMessages(normalized);
      saveChatCache(conversationId, normalized); // persist for offline/fast reload

      const incomingUndelivered = serverMsgs
        .filter(
          (m: any) =>
            String(m.receiverId) === String(myUserId) && !m.deliveredAt
        )
        .map((m: any) => String(m._id));

      if (incomingUndelivered.length) {
        await markDelivered(incomingUndelivered);
      }

      const incoming = serverMsgs.filter(
        (m: any) => String(m.receiverId) === String(myUserId)
      );

      if (incoming.length) {
        const lastIncoming = incoming[incoming.length - 1];
        await markSeen({
          conversationId: String(conversationId),
          peerUserId: String(peerUserId),
          lastSeenMessageId: String(lastIncoming._id),
        });
      }

      notifyConversationChanged();
      setTimeout(scrollToBottom, 50);
    } catch (e) {
      console.log("loadThread error — using cache", e);
      // cache already rendered, nothing else to do
    }
  }, [conversationId, myUserId, peerUserId, offline, normalizeServer]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadThread);
    loadThread();
    return unsub;
  }, [navigation, loadThread]);

  useEffect(() => {
    if (offline) return;
    const t = setInterval(loadThread, 2500);
    return () => clearInterval(t);
  }, [loadThread, offline]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !conversationId || !myUserId || offline) return;

    const now = new Date().toISOString();
    const clientMessageId = uuidv4();

    // Optimistic message so send feels instant
    const optimistic = {
      _id: clientMessageId,
      fromUserId: String(myUserId),
      toUserId: String(peerUserId),
      plaintext: text,
      createdAt: now,
      clientMessageId,
      seenAt: null,
      deliveredAt: null,
      tickState: "pending",
    };

    setMessages((prev) => {
      const updated = [...prev, optimistic];
      saveChatCache(conversationId, updated);
      return updated;
    });
    setInput("");
    setTimeout(scrollToBottom, 50);

    try {
      await sendMessage({
        conversationId: String(conversationId),
        receiverId: String(peerUserId),
        text: String(text),
        clientMessageId: String(clientMessageId),
        notifyUser: true,
      });

      await loadThread(); // replace optimistic with real message from server
    } catch (e) {
      console.log("send error", e);
    }
  }, [input, conversationId, myUserId, peerUserId, offline, loadThread]);

  const renderTick = (m: any) => {
    const s = m.tickState || "pending";
    if (s === "seen")
      return <Icon name="check-all" size={13} color="#2dd4bf" style={styles.tickIcon} />;
    if (s === "delivered")
      return <Icon name="check-all" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    if (s === "sent")
      return <Icon name="check" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    return <Icon name="clock-outline" size={13} color="#a3a3a3" style={styles.tickIcon} />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            <View style={styles.container}>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                  <Icon name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>

                <Text style={styles.title}>
                  {peerName || "Friend"} {peerMood ? `[ is feeling ${peerMood} ]` : ""}
                </Text>

                <Text style={{ color: offline ? "#f97316" : "#22c55e", fontSize: 11 }}>
                  {offline ? "Offline" : "Online"}
                </Text>
              </View>

              <FlatList
                ref={flatRef}
                data={items}
                keyExtractor={(it) => it.id}
                contentContainerStyle={{ paddingVertical: 8, paddingBottom: 20 }}
                renderItem={({ item }) => {
                  if (item.type === "date") {
                    return (
                      <View style={styles.dateRow}>
                        <Text style={styles.dateText}>
                          {formatDateHeader(item.dateKey)}
                        </Text>
                      </View>
                    );
                  }

                  const m = item.msg;
                  const isMe = String(m.fromUserId) === String(myUserId);

                  return (
                    <View
                      style={[
                        styles.msgRow,
                        isMe ? styles.msgRowMe : styles.msgRowOther,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          isMe ? styles.bubbleMe : styles.bubbleOther,
                        ]}
                      >
                        <Text style={styles.text}>{m.plaintext}</Text>
                        <View style={styles.metaRow}>
                          {isMe ? renderTick(m) : null}
                          <Text style={styles.timeText}>
                            {formatTime(m.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }}
                onContentSizeChange={scrollToBottom}
              />
            </View>

            <View style={[styles.inputBar, { paddingBottom: insets.bottom }]}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Type a message"
                  placeholderTextColor="#94a3b8"
                  value={input}
                  onChangeText={setInput}
                  multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={send}>
                  <Icon name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </SafeAreaView>
  );
}

// styles unchanged ...

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, backgroundColor: "#0f172a" },
  innerContainer: { flex: 1 },
  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTop: { position: "absolute", top: -120, left: -40, width: 220, height: 220, borderRadius: 220, backgroundColor: "rgba(59, 130, 246, 0.22)" },
  glowBottom: { position: "absolute", bottom: -140, right: -40, width: 240, height: 240, borderRadius: 240, backgroundColor: "rgba(168, 85, 247, 0.22)" },
  container: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 1, paddingVertical: 6, marginTop: 15 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(148,163,184,0.35)" },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginLeft: 12, flex: 1, marginRight: 10 },
  listContent: { paddingVertical: 8 },
  dateRow: { alignItems: "center", marginVertical: 10 },
  dateText: { color: "#cbd5e1", fontSize: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(148,163,184,0.25)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  msgRow: { width: "100%", flexDirection: "row", marginBottom: 8 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, maxWidth: "82%", minWidth: 52 },
  bubbleMe: { backgroundColor: "#4f46e5" },
  bubbleOther: { backgroundColor: "rgba(255,255,255,0.06)" },
  text: { color: "#fff", flexShrink: 1, flexWrap: "wrap" },
  timeText: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4, alignSelf: "flex-end", marginRight: 4 },
  inputBar: { paddingTop: 8, backgroundColor: "transparent" },
  inputRow: { flexDirection: "row", padding: 10, alignItems: "center", backgroundColor: "transparent" },
  input: { flex: 1, color: "#fff", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, marginRight: 8, maxHeight: 140, borderWidth: 1, borderColor: "rgba(148,163,184,0.5)" },
  sendBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 4 },
  tickIcon: { marginRight: 4 },
});