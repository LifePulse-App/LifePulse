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
import { sendCipher, pullMessages, fetchDevices } from "../services/api_e2ee";
import { SessionManager } from "../services/SessionManager";
import { toDeviceRegistrationId } from "../services/deviceRegistrationId";
import AuthContext from "../../../auth/user/UserContext";
import DeviceInfo from "react-native-device-info";
import { ensureDeviceKeys } from "../services/bootstrap";

export default function ChatScreen({ route, navigation }: any) {
  const user = useContext(AuthContext);
  const deviceId = DeviceInfo.getUniqueIdSync(); // string for API and DB
  const deviceRegId = toDeviceRegistrationId(deviceId); // numeric for Signal
  const { peerUserId, peerName } = route.params;
  const insets = useSafeAreaInsets();
  const myUserId = user?.User?.user?.id;

  const [sessionManager] = useState(() =>
    new SessionManager(myUserId, deviceRegId)
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const flatRef = useRef<FlatList>(null);

  const scrollToBottom = () =>
    requestAnimationFrame(() => flatRef.current?.scrollToEnd({ animated: true }));

  const msgKey = (m: any) =>
    `${m.fromUserId}-${m.fromDeviceId}-${new Date(m.createdAt).getTime()}-${m.ciphertext ?? m.plaintext ?? ""}`;

  const loadIncoming = useCallback(async () => {
    try {
      const { data } = await pullMessages(deviceId); // deviceId string
      const decrypted: any[] = [];
      for (const m of data.messages || []) {
        const pt = await sessionManager.decrypt(
          m.fromUserId,
          toDeviceRegistrationId(String(m.fromDeviceId)), // ensure numeric
          { type: m.header?.t, body: m.ciphertext }
        );
        decrypted.push({ ...m, plaintext: pt, createdAt: m.createdAt ?? new Date().toISOString() });
      }
      if (decrypted.length) {
        setMessages((prev) => {
          const merged = [...prev, ...decrypted];
          const seen = new Set<string>();
          const unique = merged.filter((m) => {
            const k = msgKey(m);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          return unique.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
        scrollToBottom();
      }
    } catch (e) {
      console.log("pull/decrypt error", e);
    }
  }, [sessionManager, deviceId]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadIncoming);
    loadIncoming(); // initial
    return unsub;
  }, [navigation, loadIncoming]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => LayoutAnimation.easeInEaseOut()
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => LayoutAnimation.easeInEaseOut()
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const deviceId = DeviceInfo.getUniqueIdSync();
        await ensureDeviceKeys(deviceId);
      } catch (e) {
        console.log("ensureDeviceKeys error", e);
      }
    };
    bootstrap();
  }, []);

  const send = useCallback(async () => {
    if (!input.trim()) return;
    try {
      const { data } = await fetchDevices(peerUserId);
      console.log(data);
      
      
      const now = new Date().toISOString();

      for (const d of data.devices || []) {
        const peerRegId = toDeviceRegistrationId(String(d.deviceId));
        await sessionManager.ensureSession(peerUserId, peerRegId, d);
        const cipherPayload = await sessionManager.encrypt(peerUserId, peerRegId, input);
        await sendCipher({
          toUserId: peerUserId,
          toDeviceId: d.deviceId, // string stored in DB
          fromDeviceId: deviceId, // string stored in DB
          sessionId: `sess-${peerUserId}-${d.deviceId}`,
          header: { t: cipherPayload.type },
          ciphertext: cipherPayload.body,
        });
      }

      const outgoing = {
        fromUserId: myUserId,
        fromDeviceId: deviceId,
        plaintext: input,
        createdAt: now,
      };
      setMessages((prev) => [...prev, outgoing]);
      setInput("");
      scrollToBottom();
    } catch (e) {
      console.log("send error", e);
    }
  }, [input, peerUserId, sessionManager, deviceId, myUserId]);

  const keyboardOffset = (Platform.OS === "ios" ? 60 : 0) + insets.bottom;

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View style={styles.baseBackground} />
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <View style={styles.container}>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                  <Icon name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>{peerName || "Friend"}</Text>
                <View style={{ width: 42 }} />
              </View>

              <FlatList
                ref={flatRef}
                data={messages}
                keyExtractor={msgKey}
                contentContainerStyle={[styles.listContent, { paddingBottom: 90 + insets.bottom }]}
                renderItem={({ item }) => (
                  <View style={[styles.bubble, item.fromUserId === myUserId && styles.bubbleMe]}>
                    <Text style={styles.text}>{item.plaintext || "Encrypted message"}</Text>
                  </View>
                )}
                onContentSizeChange={scrollToBottom}
              />

              <View style={[styles.inputRow, { marginBottom: Platform.OS === "ios" ? insets.bottom : 8 }]}>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f172a" },
  root: { flex: 1, backgroundColor: "#0f172a" },
  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTop: { position: "absolute", top: -120, left: -40, width: 220, height: 220, borderRadius: 220, backgroundColor: "rgba(59, 130, 246, 0.22)" },
  glowBottom: { position: "absolute", bottom: -140, right: -40, width: 240, height: 240, borderRadius: 240, backgroundColor: "rgba(168, 85, 247, 0.22)" },
  container: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingVertical: 6 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(148,163,184,0.35)" },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginLeft: 12 },
  listContent: { paddingVertical: 8 },
  bubble: { backgroundColor: "rgba(255,255,255,0.06)", padding: 10, borderRadius: 16, marginBottom: 8, maxWidth: "82%" },
  bubbleMe: { backgroundColor: "#4f46e5", marginLeft: "18%" },
  text: { color: "#fff" },
  inputRow: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    alignItems: "center",
  },
  input: { flex: 1, color: "#fff", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, marginRight: 8, maxHeight: 140 },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
});