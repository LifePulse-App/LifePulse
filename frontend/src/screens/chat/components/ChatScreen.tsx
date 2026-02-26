import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  LayoutAnimation,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

import AuthContext from "../../../auth/user/UserContext";
import { sendCipher, pullMessages, fetchDevices } from "../services/api_e2ee";
import { SessionManager } from "../services/SessionManager";
import { ensureDeviceKeys } from "../services/bootstrap";
import { getStableDeviceId } from "../../../shared/services/stableDeviceId";
import { SignalStore } from "../services/signalStore";
import { LocalMessageStore } from "../services/LocalMessageStore";
import { clearUnread, setActiveChatPeer } from '../services/ChatNotifications';
import { markMessagesAsRead } from '../services/api_e2ee';
import { getLocalSeenAt } from '../services/ChatNotifications';
import { notifyConversationChanged } from '../services/ChatNotifications';

const asNum = (v: any) => (typeof v === "string" ? parseInt(v, 10) : v);

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
  const { peerUserId, peerName, peerMood } = route.params;
  const insets = useSafeAreaInsets();

  const myUserId = user?.User?.user?.id;

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [sessionManager, setSessionManager] = useState<SessionManager | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatRef = useRef<FlatList>(null);
  const scrollToBottom = () =>
    requestAnimationFrame(() => flatRef.current?.scrollToEnd({ animated: true }));

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

  // Handle keyboard events properly
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardHeight(e.endCoordinates.height);
        // Auto scroll to bottom when keyboard opens
        setTimeout(scrollToBottom, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  useEffect(() => {
    const onFocus = async () => {
      setActiveChatPeer(String(peerUserId));
      clearUnread(String(peerUserId));
      await markMessagesAsRead(peerUserId);
    };
    const onBlur = () => setActiveChatPeer(null);
  
    onFocus();
  
    return () => {
      onBlur();
    };
  }, [navigation, peerUserId]);

  useEffect(() => {
    setItems(buildItemsWithDateSeparators(messages));
  }, [messages, buildItemsWithDateSeparators]);

  useEffect(() => {
    (async () => {
      if (!myUserId) return;
      const id = await getStableDeviceId(myUserId);
      setDeviceId(id);
      setSessionManager(new SessionManager(myUserId, id));
    })();
  }, [myUserId]);

  useEffect(() => {
    (async () => {
      try {
        if (!myUserId || !deviceId) return;
        await ensureDeviceKeys(myUserId, deviceId);
      } catch (e) {
        console.log("ensureDeviceKeys error", e);
      }
    })();
  }, [myUserId, deviceId]);

  const loadFromStorage = useCallback(async () => {
    if (!myUserId || !deviceId || !peerUserId) return;
    const store = new LocalMessageStore(String(myUserId), String(deviceId), String(peerUserId));
    const local = await store.listPlaintext();

    setMessages(
      local.map((m) => ({
        _id: m.id,
        fromUserId: String(m.fromUserId),
        fromDeviceId: String(m.fromDeviceId),
        toUserId: String(peerUserId),
        toDeviceId: String(m.toDeviceId),
        plaintext: m.plaintext,
        createdAt: m.createdAt,
      }))
    );
  }, [myUserId, deviceId, peerUserId]);

  const pullDecryptStore = useCallback(async () => {
    if (!deviceId || !myUserId || !peerUserId || !sessionManager) return;

    const store = new LocalMessageStore(String(myUserId), String(deviceId), String(peerUserId));
    const { data } = await pullMessages(deviceId);
    const pulled = data?.messages || [];
    if (!pulled.length) return;

    for (const m of pulled) {
      const peer =
        String(m.fromUserId) === String(myUserId) ? String(m.toUserId) : String(m.fromUserId);
      if (peer !== String(peerUserId)) continue;

      try {
        const pt = await sessionManager.decrypt(m.fromUserId, m.fromSignalDeviceId, {
          type: m.header?.t,
          body: m.ciphertext,
        });

        await store.upsertPlaintext({
          id: `srv:${m._id}`,
          createdAt: m.createdAt,
          fromUserId: String(m.fromUserId),
          fromDeviceId: String(m.fromDeviceId),
          toDeviceId: String(m.toDeviceId),
          plaintext: pt,
          status: "received",
        });

        notifyConversationChanged();

        setMessages((prev) => {
          const exists = prev.some((x) => String(x._id) === `srv:${m._id}`);
          if (exists) return prev;

          const next = [
            ...prev,
            {
              _id: `srv:${m._id}`,
              fromUserId: String(m.fromUserId),
              fromDeviceId: String(m.fromDeviceId),
              toUserId: String(peerUserId),
              toDeviceId: String(m.toDeviceId),
              plaintext: pt,
              createdAt: m.createdAt,
            },
          ];
          next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return next;
        });
      } catch (e) {
        console.log("decrypt failed (pull)", m._id, e);
      }
    }

    scrollToBottom();
  }, [deviceId, myUserId, peerUserId, sessionManager]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", async () => {
      await loadFromStorage();
      await pullDecryptStore();
      setTimeout(scrollToBottom, 50);
    });

    (async () => {
      await loadFromStorage();
      await pullDecryptStore();
      setTimeout(scrollToBottom, 50);
    })();

    return unsub;
  }, [navigation, loadFromStorage, pullDecryptStore]);

  useEffect(() => {
    const t = setInterval(pullDecryptStore, 2000);
    return () => clearInterval(t);
  }, [pullDecryptStore]);

  const send = useCallback(async () => {
    console.log("SEND function called", { text: input });
    const text = input.trim();
    if (!text || !sessionManager || !myUserId || !deviceId) return;
  
    const now = new Date().toISOString();
    setInput("");
  
    const localStore = new LocalMessageStore(String(myUserId), String(deviceId), String(peerUserId));
    const localId = `loc:${now}:${Math.random().toString(16).slice(2)}`;
  
    await localStore.upsertPlaintext({
      id: localId,
      createdAt: now,
      fromUserId: String(myUserId),
      fromDeviceId: String(deviceId),
      toDeviceId: String(deviceId),
      plaintext: text,
      status: "sent",
    });

    notifyConversationChanged();
  
    setMessages((prev) => {
      const next = [
        ...prev,
        {
          _id: localId,
          fromUserId: String(myUserId),
          fromDeviceId: String(deviceId),
          toUserId: String(peerUserId),
          toDeviceId: String(deviceId),
          plaintext: text,
          createdAt: now,
        },
      ];
      next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return next;
    });
    scrollToBottom();
  
    try {
      const store = new SignalStore(myUserId, deviceId);
      const mySignalDeviceId = await store.getSignalDeviceId();
      if (!mySignalDeviceId) throw new Error("Missing my signalDeviceId");
  
      const { data: peerData } = await fetchDevices(peerUserId);
      const peerDevices = peerData?.devices || [];
  
      const { data: myData } = await fetchDevices(myUserId);
      const myDevices = myData?.devices || [];
  
      const buildBundle = (d: any) => {
        const otp = d.oneTimePrekeys?.[0];
        const preKeyPub = otp?.publicKey;
  
        if (
          typeof d.signalDeviceId !== "number" ||
          typeof d.registrationId !== "number" ||
          !d.identityPub ||
          !d.signedPrekeyPub ||
          !d.signedPrekeySig ||
          !otp?.keyId ||
          !preKeyPub
        ) {
          return null;
        }
        return {
          bundle: {
            deviceId: d.signalDeviceId,
            registrationId: d.registrationId,
            identityKey: d.identityPub,
            signedPreKey: {
              keyId: asNum(d.signedPrekeyId ?? 1),
              publicKey: d.signedPrekeyPub,
              signature: d.signedPrekeySig,
            },
            preKey: {
              keyId: asNum(otp.keyId),
              publicKey: preKeyPub,
            },
          },
          otpKeyId: otp.keyId as number,
          routingDeviceId: d.deviceId as string,
        };
      };
  
      for (const [idx, d] of peerDevices.entries()) {
        const built = buildBundle(d);
        if (!built) continue;
  
        await sessionManager.ensureSession(peerUserId, built.bundle);
        const cipherPayload = await sessionManager.encrypt(peerUserId, built.bundle, text);
  
        await sendCipher({
          toUserId: peerUserId,
          toDeviceId: built.routingDeviceId,
          fromDeviceId: deviceId,
          fromSignalDeviceId: mySignalDeviceId,
          sessionId: `sess-${peerUserId}-${built.routingDeviceId}`,
          header: { t: cipherPayload.type, preKeyId: built.otpKeyId },
          ciphertext: cipherPayload.body,
          notifyUser: idx === 0,
        });
      }
  
      for (const d of myDevices) {
        const built = buildBundle(d);
        if (!built) continue;
  
        await sessionManager.ensureSession(myUserId, built.bundle);
        const cipherPayload = await sessionManager.encrypt(myUserId, built.bundle, text);
  
        await sendCipher({
          toUserId: peerUserId,
          toDeviceId: built.routingDeviceId,
          fromDeviceId: deviceId,
          fromSignalDeviceId: mySignalDeviceId,
          sessionId: `sess-${peerUserId}-${built.routingDeviceId}`,
          header: { t: cipherPayload.type, preKeyId: built.otpKeyId },
          ciphertext: cipherPayload.body,
        });
      }
    } catch (e) {
      console.log("send error", e);
    }
  }, [input, sessionManager, myUserId, deviceId, peerUserId]);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={styles.root}>
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.innerContainer}>
            <View style={styles.container}>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                  <Icon name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>
                  {peerName || "Friend"} {peerMood ? `[ is feeling ${peerMood} ] ` : ""}
                </Text>
                <View style={{ width: 42 }} />
              </View>

              <FlatList
                ref={flatRef}
                data={items}
                keyExtractor={(it) => it.id}
                contentContainerStyle={[
                  styles.listContent, 
                  { paddingBottom: 20 }
                ]}
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
                  const localSeenAt = getLocalSeenAt(m.toUserId);
                  let showBlueTick = false;
                  if (isMe) {
                    showBlueTick = !!m.seenAt ||
                      (!!localSeenAt && new Date(m.createdAt) <= new Date(localSeenAt));
                  }
                
                  return (
                    <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={styles.text}>{m.plaintext}</Text>
                        </View>
                        
                        <View style={styles.metaRow}>
                          {isMe ? (
                            <Icon
                              name={showBlueTick ? "check-all" : "check"}
                              size={13}
                              color={showBlueTick ? "#2dd4bf" : "#a3a3a3"}
                              style={styles.tickIcon}
                            />
                          ) : null}
                          <Text style={styles.timeText}>{formatTime(m.createdAt)}</Text>
                        </View>
                      </View>
                    </View>
                  );
                }}
                onContentSizeChange={scrollToBottom}
              />
            </View>

            <View style={[
              styles.inputBar, 
              { 
                paddingBottom: insets.bottom,
                marginBottom: 5,
                backgroundColor: "transparent"
              }
            ]}>
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
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 1, paddingVertical: 6, marginTop: 15 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginLeft: 12 },

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
  timeText: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4, alignSelf: "flex-end", marginRight: 4 },

  inputBar: {
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    backgroundColor: "transparent",
  },
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  tickIcon: {
    marginRight: 4,
  },
});