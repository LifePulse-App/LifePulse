import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  LayoutAnimation,
  Image,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { v4 as uuidv4 } from "uuid";

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
  isMessageDeliveredLocally,
} from "../services/ChatNotifications";
import {
  loadThreadMessages as loadThreadCacheV2,
  saveThreadMessages as saveThreadCacheV2,
  upsertThreadMessage as upsertThreadMessageV2,
  upsertConversationPreview as upsertPreviewV2,
} from "../services/LocalChatCache";
import apiClient from "../../../auth/api-client/api_client";

type Item =
  | { type: "date"; id: string; dateKey: string }
  | { type: "msg"; id: string; msg: any };

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
  const { peerUserId, peerName, peerMood, peerAvatarUrl, avatarUrl } = route.params;
  const insets = useSafeAreaInsets();

  const myUserId = String(user?.User?.user?.id || user?.User?.user?._id || "");

  const [conversationId, setConversationId] = useState<string | null>(
    route?.params?.conversationId || null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [offline, setOffline] = useState(false);

  const flatRef = useRef<FlatList>(null);
  const didInitialAutoScrollRef = useRef(false);

  const resolvedPeerAvatar = String(peerAvatarUrl || avatarUrl || "");
  const [avatarFailed, setAvatarFailed] = useState(false);

      const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

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
    const onFocus = async () => {
      setActiveChatPeer(String(peerUserId));
      clearUnread(String(peerUserId));
    };
    const onBlur = () => setActiveChatPeer(null);
    onFocus();
    return onBlur;
  }, [peerUserId]);

  useEffect(() => {
    setItems(buildItemsWithDateSeparators(messages));
  }, [messages, buildItemsWithDateSeparators]);

  useEffect(() => {
    (async () => {
      if (conversationId || !myUserId || offline) return;
      try {
        const { data } = await openDirectConversation(String(peerUserId));
        const cid = data?.conversation?._id;
        if (cid) setConversationId(String(cid));
      } catch (e) {
        console.log("openDirectConversation error", e);
      }
    })();
  }, [peerUserId, conversationId, myUserId, offline]);

  const loadThread = useCallback(async () => {
    if (!conversationId || !myUserId) return;

    const cached = await loadThreadCacheV2(String(myUserId), String(conversationId));
    if (cached.length) {
      const normalizedCached = normalizeServer(
        cached.map((m: any) => ({
          _id: m._id,
          senderId: m.senderId,
          receiverId: m.receiverId,
          text: m.text,
          createdAt: m.createdAt,
          clientMessageId: m.clientMessageId,
          deliveredAt: m.deliveredAt,
          seenAt: m.seenAt,
        }))
      );
      setMessages(normalizedCached);
    }

    if (offline) return;

    try {
      const { data } = await fetchThread(String(conversationId), { limit: 200 });
      const serverMsgs = data?.messages || [];

      await saveThreadCacheV2(
        String(myUserId),
        String(conversationId),
        serverMsgs.map((m: any) => ({
          _id: String(m._id),
          conversationId: String(conversationId),
          senderId: String(m.senderId),
          receiverId: String(m.receiverId),
          text: String(m.text || ""),
          createdAt: m.createdAt,
          clientMessageId: m.clientMessageId,
          deliveredAt: m.deliveredAt || null,
          seenAt: m.seenAt || null,
        }))
      );

      if (serverMsgs.length) {
        const last = serverMsgs[serverMsgs.length - 1];
        await upsertPreviewV2(String(myUserId), {
          conversationId: String(conversationId),
          peerUserId: String(peerUserId),
          peerName: String(peerName || "Friend"),
          mood: String(peerMood || ""),
          lastText: String(last.text || ""),
          lastAt: String(last.createdAt || new Date().toISOString()),
          unread: 0,
        });
      }

      const normalizedServer = normalizeServer(serverMsgs);

      setMessages((prev) => {
        const serverClientIds = new Set(
          normalizedServer
            .map((m: any) => m.clientMessageId)
            .filter(Boolean)
            .map((x: any) => String(x))
        );

        const serverIds = new Set(normalizedServer.map((m: any) => String(m._id)));

        const stillPendingLocal = prev.filter((m: any) => {
          const isLocalId = String(m._id).startsWith("loc:");
          const hasClientId = !!m.clientMessageId;
          const existsOnServerById = serverIds.has(String(m._id));
          const existsOnServerByClientId =
            hasClientId && serverClientIds.has(String(m.clientMessageId));
          return isLocalId && !existsOnServerById && !existsOnServerByClientId;
        });

        return [...normalizedServer, ...stillPendingLocal].sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });

      const incomingUndelivered = serverMsgs
        .filter((m: any) => String(m.receiverId) === String(myUserId) && !m.deliveredAt)
        .map((m: any) => String(m._id));

      if (incomingUndelivered.length) {
        await markDelivered(incomingUndelivered);
      }

      const incoming = serverMsgs.filter((m: any) => String(m.receiverId) === String(myUserId));
      if (incoming.length) {
        const lastIncoming = incoming[incoming.length - 1];
        await markSeen({
          conversationId: String(conversationId),
          peerUserId: String(peerUserId),
          lastSeenMessageId: String(lastIncoming._id),
        });
      }

      notifyConversationChanged();
    } catch (e) {
      console.log("loadThread error — using cache", e);
    }
  }, [conversationId, myUserId, peerUserId, peerName, peerMood, offline, normalizeServer]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", async () => {
      didInitialAutoScrollRef.current = false;
      await loadThread();
      setTimeout(scrollToBottom, 60);
    });

    (async () => {
      await loadThread();
      setTimeout(scrollToBottom, 60);
    })();

    return unsub;
  }, [navigation, loadThread]);

  useEffect(() => {
    if (offline) return;
    const t = setInterval(loadThread, 2500);
    return () => clearInterval(t);
  }, [loadThread, offline]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !conversationId || !myUserId) return;

    const now = new Date().toISOString();
    const clientMessageId = uuidv4();
    const localId = `loc:${clientMessageId}`;
    setInput("");

    setMessages((prev) => {
      const next = [
        ...prev,
        {
          _id: localId,
          fromUserId: String(myUserId),
          toUserId: String(peerUserId),
          plaintext: text,
          createdAt: now,
          clientMessageId,
          tickState: "pending",
          deliveredAt: null,
          seenAt: null,
        },
      ].sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      return next;
    });

    scrollToBottom();

    await upsertThreadMessageV2(String(myUserId), String(conversationId), {
      _id: localId,
      conversationId: String(conversationId),
      senderId: String(myUserId),
      receiverId: String(peerUserId),
      text,
      createdAt: now,
      clientMessageId,
      deliveredAt: null,
      seenAt: null,
    });

    await upsertPreviewV2(String(myUserId), {
      conversationId: String(conversationId),
      peerUserId: String(peerUserId),
      peerName: String(peerName || "Friend"),
      mood: String(peerMood || ""),
      lastText: text,
      lastAt: now,
      unread: 0,
    });

    notifyConversationChanged();

    if (offline) return;

    try {
      const { data } = await sendMessage({
        conversationId: String(conversationId),
        receiverId: String(peerUserId),
        text: String(text),
        clientMessageId: String(clientMessageId),
        notifyUser: true,
      });

      const srv = data?.message;

      if (srv?._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId
              ? {
                  ...m,
                  _id: String(srv._id),
                  createdAt: srv.createdAt || m.createdAt,
                  tickState: srv.seenAt ? "seen" : srv.deliveredAt ? "delivered" : "sent",
                  deliveredAt: srv.deliveredAt || null,
                  seenAt: srv.seenAt || null,
                }
              : m
          )
        );

        await upsertThreadMessageV2(String(myUserId), String(conversationId), {
          _id: String(srv._id),
          conversationId: String(conversationId),
          senderId: String(myUserId),
          receiverId: String(peerUserId),
          text: String(srv.text || text),
          createdAt: String(srv.createdAt || now),
          clientMessageId: String(clientMessageId),
          deliveredAt: srv.deliveredAt || null,
          seenAt: srv.seenAt || null,
        });

        await upsertPreviewV2(String(myUserId), {
          conversationId: String(conversationId),
          peerUserId: String(peerUserId),
          peerName: String(peerName || "Friend"),
          mood: String(peerMood || ""),
          lastText: String(srv.text || text),
          lastAt: String(srv.createdAt || now),
          unread: 0,
        });
      }

      notifyConversationChanged();
      setTimeout(() => {
        loadThread();
      }, 600);
    } catch (e) {
      console.log("send error", e);
    }
  }, [input, conversationId, myUserId, peerUserId, peerName, peerMood, offline, loadThread]);

  const renderTick = (m: any) => {
    const s = m.tickState || "pending";
    if (s === "seen") return <Icon name="check-all" size={13} color="#2dd4bf" style={styles.tickIcon} />;
    if (s === "delivered") return <Icon name="check-all" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    if (s === "sent") return <Icon name="check" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    return <Icon name="clock-outline" size={13} color="#a3a3a3" style={styles.tickIcon} />;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.innerContainer}>
          <View style={styles.container}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Icon name="arrow-left" size={22} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.titlePressable}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate("ProfilePreview", {
                    userId: String(peerUserId),
                  })
                }
              >
                {resolvedPeerAvatar && !avatarFailed ? (
                  <Image
                    source={{ uri: newUrl + resolvedPeerAvatar }}
                    style={styles.headerAvatar}
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <View style={styles.headerAvatarFallback}>
                    {/* ✅ person icon fallback */}
                    <Icon name="account" size={18} color="#cbd5e1" />
                  </View>
                )}

                <Text numberOfLines={1} style={styles.title}>
                  {peerName || "Friend"} {peerMood ? `[ is ${peerMood} ] ` : ""}
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              ref={flatRef}
              data={items}
              keyExtractor={(it) => it.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
              removeClippedSubviews={false}
              initialNumToRender={20}
              windowSize={10}
              renderItem={({ item }) => {
                if (item.type === "date") {
                  return (
                    <View style={styles.dateRow}>
                      <Text style={styles.dateText}>{formatDateHeader(item.dateKey)}</Text>
                    </View>
                  );
                }

                const m = item.msg;
                const isMe = String(m.fromUserId) === String(myUserId);

                const effectiveTickState =
                  isMe &&
                  !m.seenAt &&
                  !m.deliveredAt &&
                  (
                    isMessageDeliveredLocally(String(m._id)) ||
                    (m.clientMessageId && isMessageDeliveredLocally(String(m.clientMessageId)))
                  )
                    ? "delivered"
                    : m.tickState;

                return (
                  <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                      <Text style={styles.text}>{m.plaintext}</Text>
                      <View style={styles.metaRow}>
                        {isMe ? renderTick({ ...m, tickState: effectiveTickState }) : null}
                        <Text style={styles.timeText}>{formatTime(m.createdAt)}</Text>
                      </View>
                    </View>
                  </View>
                );
              }}
              onContentSizeChange={() => {
                if (!didInitialAutoScrollRef.current) {
                  didInitialAutoScrollRef.current = true;
                  scrollToBottom();
                }
              }}
            />
          </View>

          <View style={[styles.inputBar, { paddingBottom: insets.bottom, marginBottom: 5 }]}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={offline ? "Offline: message will stay local" : "Type a message"}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, backgroundColor: "#0f172a" },
  innerContainer: { flex: 1 },
  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTop: {
    position: "absolute",
    top: -120,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(59, 130, 246, 0.22)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: "rgba(168, 85, 247, 0.22)",
  },
  container: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 1,
    paddingVertical: 6,
    marginTop: 15,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    marginRight: 8,
  },

  titlePressable: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },

  title: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 },
  listContent: { paddingVertical: 8 },
  dateRow: { alignItems: "center", marginVertical: 10 },
  dateText: {
    color: "#cbd5e1",
    fontSize: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  msgRow: { width: "100%", flexDirection: "row", marginBottom: 8 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, maxWidth: "82%", minWidth: 52 },
  bubbleMe: { backgroundColor: "#4f46e5" },
  bubbleOther: { backgroundColor: "rgba(255,255,255,0.06)" },
  text: { color: "#fff", flexShrink: 1, flexWrap: "wrap" },
  timeText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
    marginRight: 4,
  },
  inputBar: { paddingTop: 8, backgroundColor: "transparent" },
  inputRow: { flexDirection: "row", padding: 10, alignItems: "center", backgroundColor: "transparent" },
  input: {
    flex: 1,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    marginRight: 8,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.5)",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 4 },
  tickIcon: { marginRight: 4 },
});