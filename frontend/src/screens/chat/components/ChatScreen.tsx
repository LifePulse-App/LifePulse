import React, { useEffect, useState, useCallback, useRef, useContext } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Image,
  Modal,
  Pressable,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { v4 as uuidv4 } from "uuid";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import { pick, types } from "@react-native-documents/picker";
import Video from "react-native-video";
import FileViewer from "react-native-file-viewer";
import RNFS from "react-native-fs";

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

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024;

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
const stableMessageKey = (m: any) =>
  m?.clientMessageId ? `c:${String(m.clientMessageId)}` : `i:${String(m?._id ?? "")}`;

const dedupeMessages = (arr: any[]) => {
  const map = new Map<string, any>();
  for (const m of arr) {
    const k = stableMessageKey(m);
    const ex = map.get(k);
    if (!ex) {
      map.set(k, m);
      continue;
    }
    const exLocal = String(ex._id).startsWith("loc:");
    const curLocal = String(m._id).startsWith("loc:");
    if (exLocal && !curLocal) { map.set(k, m); continue; }
    if (!exLocal && curLocal) continue;
    const rank = (x: any) => (x.seenAt ? 3 : x.deliveredAt ? 2 : x.tickState === "sent" ? 1 : 0);
    if (rank(m) > rank(ex)) { map.set(k, m); continue; }
    const exT = new Date(ex.createdAt || 0).getTime();
    const curT = new Date(m.createdAt || 0).getTime();
    if (curT >= exT) map.set(k, m);
  }
  return Array.from(map.values()).sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

const detectTypeFromMime = (mime?: string) => {
  const m = String(mime || "");
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  return "document";
};

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [glassError, setGlassError] = useState<string | null>(null);

  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState("");

  const flatRef = useRef<FlatList>(null);
  const didInitialAutoScrollRef = useRef(false);
  const isNearBottomRef = useRef(true); // ✅ track if user is near bottom

  const resolvedPeerAvatar = String(peerAvatarUrl || avatarUrl || "");
  const [avatarFailed, setAvatarFailed] = useState(false);

  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() =>
      flatRef.current?.scrollToEnd({ animated })
    );
  }, []);

  const showGlassyError = (msg: string) => {
    setGlassError(msg);
    setTimeout(() => setGlassError(null), 2600);
  };

  const openImageViewer = (url: string) => {
    setActiveImageUrl(url);
    setImageViewerVisible(true);
  };

  const getMediaUrl = (m: any) => {
    const raw = String(m?.media?.url || "");
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `${newUrl}${raw.startsWith("/") ? "" : "/"}${raw}`;
  };

  const ensureCameraPerms = async () => {
    if (Platform.OS !== "android") return true;
    const cam = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    const mic = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return (
      cam === PermissionsAndroid.RESULTS.GRANTED &&
      mic === PermissionsAndroid.RESULTS.GRANTED
    );
  };

  const openDocInApp = async (url: string, name?: string) => {
    try {
      const ext = (name?.split(".").pop() || "bin").toLowerCase();
      const filePath = `${RNFS.CachesDirectoryPath}/chat_${Date.now()}.${ext}`;
      const r = await RNFS.downloadFile({ fromUrl: url, toFile: filePath }).promise;
      if (r.statusCode >= 200 && r.statusCode < 300) {
        await FileViewer.open(filePath, { showOpenWithDialog: true });
      } else {
        showGlassyError("Failed to open document");
      }
    } catch {
      showGlassyError("Cannot open this document");
    }
  };

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
          } else tickState = "delivered";
          return {
            _id: String(m._id),
            fromUserId: String(m.senderId),
            toUserId: String(m.receiverId),
            plaintext: String(m.text || ""),
            messageType: m.messageType || "text",
            media: m.media || null,
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
      out.push({ type: "msg", id: `msg_${stableMessageKey(m)}`, msg: m });
    }
    return out;
  }, []);

  // ✅ Keyboard listeners — scroll to bottom when keyboard opens
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      if (isNearBottomRef.current) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    });
    return () => showSub.remove();
  }, [scrollToBottom]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) =>
      setOffline(!state.isConnected || state.isInternetReachable === false)
    );
    return () => unsub();
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
      } catch {}
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
          messageType: m.messageType || "text",
          media: m.media || null,
          createdAt: m.createdAt,
          clientMessageId: m.clientMessageId,
          deliveredAt: m.deliveredAt,
          seenAt: m.seenAt,
        }))
      );
      setMessages(dedupeMessages(normalizedCached));
    } else {
      setMessages([]);
    }

    if (offline) return;

    try {
      const { data } = await fetchThread(String(conversationId), { limit: 200 });
      const serverMsgs = data?.messages || [];

      if (serverMsgs.length) {
        await saveThreadCacheV2(
          String(myUserId),
          String(conversationId),
          serverMsgs.map((m: any) => ({
            _id: String(m._id),
            conversationId: String(conversationId),
            senderId: String(m.senderId),
            receiverId: String(m.receiverId),
            text: String(m.text || ""),
            messageType: String(m.messageType || "text"),
            media: m.media || null,
            createdAt: m.createdAt,
            clientMessageId: m.clientMessageId,
            deliveredAt: m.deliveredAt || null,
            seenAt: m.seenAt || null,
          }))
        );

        const normalizedServer = normalizeServer(serverMsgs);
        setMessages((prev) => {
          const serverClientIds = new Set(
            normalizedServer.map((m: any) => m.clientMessageId).filter(Boolean).map((x: any) => String(x))
          );
          const serverIds = new Set(normalizedServer.map((m: any) => String(m._id)));
          const stillPendingLocal = prev.filter((m: any) => {
            const isLocalId = String(m._id).startsWith("loc:");
            const hasClientId = !!m.clientMessageId;
            const existsOnServerById = serverIds.has(String(m._id));
            const existsOnServerByClientId = hasClientId && serverClientIds.has(String(m.clientMessageId));
            return isLocalId && !existsOnServerById && !existsOnServerByClientId;
          });
          return dedupeMessages([...normalizedServer, ...stillPendingLocal]);
        });

        const last = serverMsgs[serverMsgs.length - 1];
        const previewText =
          last?.messageType === "image" ? "📷 Photo"
          : last?.messageType === "video" ? "🎥 Video"
          : last?.messageType === "document" ? "📎 Document"
          : String(last.text || "");

        await upsertPreviewV2(String(myUserId), {
          conversationId: String(conversationId),
          peerUserId: String(peerUserId),
          peerName: String(peerName || "Friend"),
          mood: String(peerMood || ""),
          lastText: previewText,
          lastAt: String(last.createdAt || new Date().toISOString()),
          unread: 0,
        });

        const incomingUndelivered = serverMsgs
          .filter((m: any) => String(m.receiverId) === String(myUserId) && !m.deliveredAt)
          .map((m: any) => String(m._id));
        if (incomingUndelivered.length) await markDelivered(incomingUndelivered);

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
      } else {
        console.log("API returned empty thread, cache not cleared");
      }
    } catch (e) {
      console.log("fetchThread failed — showing cached messages", e);
      notifyConversationChanged();
    }
  }, [conversationId, myUserId, peerUserId, peerName, peerMood, offline, normalizeServer]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", async () => {
      didInitialAutoScrollRef.current = false;
      await loadThread();
      setTimeout(() => scrollToBottom(false), 60);
    });
    (async () => {
      await loadThread();
      setTimeout(() => scrollToBottom(false), 60);
    })();
    return unsub;
  }, [navigation, loadThread, scrollToBottom]);

  useEffect(() => {
    if (offline) return;
    const t = setInterval(loadThread, 2500);
    return () => clearInterval(t);
  }, [loadThread, offline]);

  const uploadOne = async (f: { uri: string; type?: string; name?: string }) => {
    const form = new FormData();
    form.append("file", {
      uri: f.uri,
      type: f.type || "application/octet-stream",
      name: f.name || `file_${Date.now()}`,
    } as any);
    const res = await apiClient.post("/chat/messages/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const d = res?.data || {};
    if (!d?.media?.url) throw new Error("Upload failed");
    return { messageType: d.messageType || detectTypeFromMime(d.media?.mimeType), media: d.media };
  };

  const sendMediaMessage = async (uploaded: { messageType: string; media: any }) => {
    if (!conversationId || !myUserId) return;
    const now = new Date().toISOString();
    const clientMessageId = uuidv4();
    const localId = `loc:${clientMessageId}`;

    setMessages((prev) =>
      dedupeMessages([...prev, {
        _id: localId,
        fromUserId: String(myUserId),
        toUserId: String(peerUserId),
        plaintext: "",
        messageType: uploaded.messageType,
        media: uploaded.media,
        createdAt: now,
        clientMessageId,
        tickState: "pending",
        deliveredAt: null,
        seenAt: null,
      }])
    );

    await upsertThreadMessageV2(String(myUserId), String(conversationId), {
      _id: localId,
      conversationId: String(conversationId),
      senderId: String(myUserId),
      receiverId: String(peerUserId),
      text: "",
      messageType: uploaded.messageType,
      media: uploaded.media,
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
      lastText:
        uploaded.messageType === "image" ? "📷 Photo"
        : uploaded.messageType === "video" ? "🎥 Video"
        : "📎 Document",
      lastAt: now,
      unread: 0,
    });

    notifyConversationChanged();

    const { data } = await sendMessage({
      conversationId: String(conversationId),
      receiverId: String(peerUserId),
      text: "",
      messageType: uploaded.messageType,
      media: uploaded.media,
      clientMessageId: String(clientMessageId),
      notifyUser: true,
    });

    const srv = data?.message;
    if (srv?._id) {
      setMessages((prev) =>
        dedupeMessages(prev.map((mm) =>
          mm.clientMessageId === clientMessageId
            ? {
                ...mm,
                _id: String(srv._id),
                createdAt: srv.createdAt || mm.createdAt,
                media: srv.media || mm.media,
                messageType: srv.messageType || mm.messageType,
                tickState: srv.seenAt ? "seen" : srv.deliveredAt ? "delivered" : "sent",
                deliveredAt: srv.deliveredAt || null,
                seenAt: srv.seenAt || null,
              }
            : mm
        ))
      );
    }
  };

  const processAndSendFiles = async (
    files: Array<{ uri: string; type?: string; name?: string; fileSize?: number }>
  ) => {
    if (!files.length) return;
    if (offline) return showGlassyError("You're offline. Media upload needs internet.");
    if (files.length > MAX_FILES) return showGlassyError(`Select up to ${MAX_FILES} files only.`);
    const over = files.find((f) => Number(f.fileSize || 0) > MAX_SIZE);
    if (over) return showGlassyError("Each file must be <= 50MB.");
    try {
      setSendingMedia(true);
      for (const f of files) {
        const uploaded = await uploadOne(f);
        await sendMediaMessage(uploaded);
      }
      setTimeout(() => scrollToBottom(true), 80);
    } catch (e: any) {
      showGlassyError(e?.message || "Failed to send media");
    } finally {
      setSendingMedia(false);
    }
  };

  const pickFromGallery = async () => {
    try {
      setSheetOpen(false);
      const res = await launchImageLibrary({ mediaType: "mixed", selectionLimit: MAX_FILES, includeExtra: true });
      if (res.didCancel || !res.assets?.length) return;
      await processAndSendFiles(res.assets.map((a) => ({
        uri: String(a.uri || ""), type: a.type, name: a.fileName || `media_${Date.now()}`, fileSize: a.fileSize,
      })));
    } catch { showGlassyError("Could not open gallery"); }
  };

  const openCameraPhoto = async () => {
    try {
      setSheetOpen(false);
      const ok = await ensureCameraPerms();
      if (!ok) return showGlassyError("Camera permission denied");
      const res = await launchCamera({ mediaType: "photo", saveToPhotos: true });
      if (res.didCancel || !res.assets?.length) return;
      await processAndSendFiles(res.assets.map((a) => ({
        uri: String(a.uri || ""), type: a.type, name: a.fileName || `photo_${Date.now()}.jpg`, fileSize: a.fileSize,
      })));
    } catch { showGlassyError("Could not open camera"); }
  };

  const openCameraVideo = async () => {
    try {
      setSheetOpen(false);
      const ok = await ensureCameraPerms();
      if (!ok) return showGlassyError("Camera/Mic permission denied");
      const res = await launchCamera({ mediaType: "video", videoQuality: "high", saveToPhotos: true });
      if (res.didCancel || !res.assets?.length) return;
      await processAndSendFiles(res.assets.map((a) => ({
        uri: String(a.uri || ""), type: a.type, name: a.fileName || `video_${Date.now()}.mp4`, fileSize: a.fileSize,
      })));
    } catch { showGlassyError("Could not record video"); }
  };

  const pickDocuments = async () => {
    try {
      setSheetOpen(false);
      const docs = await pick({ allowMultiSelection: true, type: [types.allFiles] });
      if (!docs?.length) return;
      if (docs.length > MAX_FILES) return showGlassyError(`Select up to ${MAX_FILES} files only.`);
      await processAndSendFiles(docs.map((d: any) => ({
        uri: d.uri, type: d.type, name: d.name || `doc_${Date.now()}`, fileSize: d.size,
      })));
    } catch (e: any) {
      const code = e?.code || e?.name;
      if (code === "DOCUMENT_PICKER_CANCELED" || code === "OPERATION_CANCELED" || code === "AbortError") return;
      showGlassyError("Could not pick documents");
    }
  };

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !conversationId || !myUserId) return;
    const now = new Date().toISOString();
    const clientMessageId = uuidv4();
    const localId = `loc:${clientMessageId}`;
    setInput("");

    setMessages((prev) =>
      dedupeMessages([...prev, {
        _id: localId,
        fromUserId: String(myUserId),
        toUserId: String(peerUserId),
        plaintext: text,
        messageType: "text",
        media: null,
        createdAt: now,
        clientMessageId,
        tickState: "pending",
        deliveredAt: null,
        seenAt: null,
      }])
    );

    await upsertThreadMessageV2(String(myUserId), String(conversationId), {
      _id: localId,
      conversationId: String(conversationId),
      senderId: String(myUserId),
      receiverId: String(peerUserId),
      text,
      messageType: "text",
      media: null,
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
    // ✅ Scroll to bottom immediately after sending
    setTimeout(() => scrollToBottom(true), 50);

    if (offline) return;

    try {
      const { data } = await sendMessage({
        conversationId: String(conversationId),
        receiverId: String(peerUserId),
        text: String(text),
        messageType: "text",
        clientMessageId: String(clientMessageId),
        notifyUser: true,
      });

      const srv = data?.message;
      if (srv?._id) {
        setMessages((prev) =>
          dedupeMessages(prev.map((m) =>
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
          ))
        );
      }
      setTimeout(() => loadThread(), 600);
    } catch {
      showGlassyError("Failed to send message");
    }
  }, [input, conversationId, myUserId, peerUserId, peerName, peerMood, offline, loadThread, scrollToBottom]);

  const renderTick = (m: any) => {
    const s = m.tickState || "pending";
    if (s === "seen") return <Icon name="check-all" size={13} color="#2090af" style={styles.tickIcon} />;
    if (s === "delivered") return <Icon name="check-all" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    if (s === "sent") return <Icon name="check" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    return <Icon name="clock-outline" size={13} color="#a3a3a3" style={styles.tickIcon} />;
  };

  const renderMedia = (m: any) => {
    const t = m.messageType || "text";
    if (t === "text") return <Text style={styles.text}>{m.plaintext}</Text>;
    const mediaUrl = getMediaUrl(m);
    if (!mediaUrl) return null;
    if (t === "image") {
      return (
        <TouchableOpacity activeOpacity={0.9} onPress={() => mediaUrl ? openImageViewer(mediaUrl) : showGlassyError("Image not ready")}>
          <View style={styles.mediaContainer}>
            <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />
          </View>
        </TouchableOpacity>
      );
    }
    if (t === "video") {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoWrap}>
            <Video source={{ uri: mediaUrl }} style={styles.video} controls resizeMode="cover" paused />
          </View>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={() => openDocInApp(mediaUrl, m?.media?.name)}>
        <View style={styles.mediaContainer}>
          <View style={styles.docRow}>
            <Icon name="file-document-outline" size={22} color="#fff" />
            <Text style={styles.docName} numberOfLines={1}>{m?.media?.name || "Document"}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <View style={{ flex: 1, backgroundColor: "#020617" }}>
        <View style={styles.root}>
          <View style={styles.baseBackground} />
          <View style={styles.glowTop} />
          <View style={styles.glowBottom} />

          {!!glassError && (
            <View style={styles.errorCard}>
              <Icon name="alert-circle-outline" size={18} color="#FEE2E2" />
              <Text style={styles.errorText}>{glassError}</Text>
            </View>
          )}

          <View style={styles.innerContainer}>
            <View style={styles.container}>
              <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                  <Icon name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.titlePressable}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate("ProfilePreview", { userId: String(peerUserId) })}
                >
                  {resolvedPeerAvatar && !avatarFailed ? (
                    <Image
                      source={{ uri: newUrl + resolvedPeerAvatar }}
                      style={styles.headerAvatar}
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <View style={styles.headerAvatarFallback}>
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
                showsVerticalScrollIndicator={false}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                removeClippedSubviews={false}
                initialNumToRender={20}
                windowSize={10}
                // ✅ Track if user scrolled up — don't auto scroll if they did
                onScroll={(e) => {
                  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                  const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
                  isNearBottomRef.current = distanceFromBottom < 100;
                }}
                scrollEventThrottle={16}
                // ✅ Auto scroll on initial load and new messages if near bottom
                onContentSizeChange={() => {
                  if (!didInitialAutoScrollRef.current) {
                    didInitialAutoScrollRef.current = true;
                    scrollToBottom(false);
                    return;
                  }
                  if (isNearBottomRef.current) {
                    scrollToBottom(true);
                  }
                }}
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
                  const isMedia = m.messageType && m.messageType !== "text";
                  const effectiveTickState =
                    isMe && !m.seenAt && !m.deliveredAt &&
                    (isMessageDeliveredLocally(String(m._id)) ||
                      (m.clientMessageId && isMessageDeliveredLocally(String(m.clientMessageId))))
                      ? "delivered"
                      : m.tickState;

                  return (
                    <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        {isMedia ? (
                          <>
                            {renderMedia(m)}
                            <View style={styles.metaRowMedia}>
                              {isMe ? renderTick({ ...m, tickState: effectiveTickState }) : null}
                              <Text style={styles.timeText}>{formatTime(m.createdAt)}</Text>
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={isMe ? styles.textBubbleMe : styles.textBubbleOther}>
                              {renderMedia(m)}
                            </View>
                            <View style={styles.metaRow}>
                              {isMe ? renderTick({ ...m, tickState: effectiveTickState }) : null}
                              <Text style={styles.timeText}>{formatTime(m.createdAt)}</Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
            </View>

            {/* ✅ KeyboardAvoidingView wraps ONLY the input bar */}
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={0}
            >
              <View style={[styles.inputBar, {
                paddingBottom: Platform.OS === "ios" ? Math.max(insets.bottom, 2) : insets.bottom,
                marginBottom: 0,
              }]}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder={offline ? "Offline: message will stay local" : "Type a message"}
                    placeholderTextColor="#94a3b8"
                    value={input}
                    onChangeText={setInput}
                    multiline
                  />
                  {sendingMedia ? (
                    <View style={styles.sendBtn}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.attachBtn} onPress={() => setSheetOpen(true)}>
                        <Icon name="paperclip" size={20} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.sendBtn} onPress={send}>
                        <Icon name="send" size={20} color="#fff" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>

          {/* Image Viewer Modal */}
          <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
            <View style={styles.imageViewerRoot}>
              <TouchableOpacity style={styles.imageViewerClose} onPress={() => setImageViewerVisible(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Image source={{ uri: activeImageUrl }} style={styles.imageViewerImage} resizeMode="contain" />
            </View>
          </Modal>

          {/* Attach Sheet Modal */}
          <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
            <Pressable style={styles.sheetOverlay} onPress={() => setSheetOpen(false)} />
            <View style={styles.sheetCard}>
              <Text style={styles.sheetTitle}>Attach</Text>
              <View style={styles.sheetGrid}>
                <TouchableOpacity style={styles.sheetTile} onPress={openCameraPhoto}>
                  <Icon name="camera-outline" size={24} color="#fff" />
                  <Text style={styles.sheetTileText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetTile} onPress={openCameraVideo}>
                  <Icon name="video-outline" size={24} color="#fff" />
                  <Text style={styles.sheetTileText}>Record</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetTile} onPress={pickFromGallery}>
                  <Icon name="image-multiple-outline" size={24} color="#fff" />
                  <Text style={styles.sheetTileText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetTile} onPress={pickDocuments}>
                  <Icon name="file-document-outline" size={24} color="#fff" />
                  <Text style={styles.sheetTileText}>Document</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetHint}>Max 10 files • 50MB each</Text>
            </View>
          </Modal>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  root: { flex: 1, backgroundColor: "#020617" },
  innerContainer: { flex: 1, backgroundColor: "#020617" },
  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTop: {
    position: "absolute", top: -120, left: -40, width: 220, height: 220,
    borderRadius: 220, backgroundColor: "rgba(59, 130, 246, 0.22)",
  },
  glowBottom: {
    position: "absolute", bottom: -140, right: -40, width: 240, height: 240,
    borderRadius: 240, backgroundColor: "rgba(168, 85, 247, 0.22)",
  },
  errorCard: {
    position: "absolute", top: 16, left: 12, right: 12, zIndex: 20,
    flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14,
    backgroundColor: "rgba(127, 29, 29, 0.45)", borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.5)",
  },
  errorText: { color: "#FEE2E2", marginLeft: 8, fontSize: 12, flex: 1 },
  container: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 1, paddingVertical: 6,
    marginTop: Platform.OS === "ios" ? 35 : 15,
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(148,163,184,0.35)", marginRight: 8,
  },
  titlePressable: {
    flex: 1, marginLeft: 12, marginRight: 10, paddingVertical: 4,
    flexDirection: "row", alignItems: "center",
  },
  headerAvatar: {
    width: 34, height: 34, borderRadius: 17, marginRight: 10,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerAvatarFallback: {
    width: 34, height: 34, borderRadius: 17, marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(148,163,184,0.35)",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 },
  listContent: { paddingVertical: 8 },
  dateRow: { alignItems: "center", marginVertical: 10 },
  dateText: {
    color: "#cbd5e1", fontSize: 12, backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(148,163,184,0.25)",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden",
  },
  msgRow: { width: "100%", flexDirection: "row", marginBottom: 8 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  bubble: {
    paddingHorizontal: 0, paddingVertical: 0, maxWidth: "82%",
    minWidth: 5, position: "relative", overflow: "hidden",
  },
  bubbleMe: { backgroundColor: "transparent" },
  bubbleOther: { backgroundColor: "transparent" },
  textBubbleMe: {
    backgroundColor: "#4f46e5", paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 16,
  },
  textBubbleOther: {
    backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 16,
  },
  text: { color: "#fff", flexShrink: 1, flexWrap: "wrap" },
  mediaContainer: { paddingBottom: 0 },
  mediaImage: { width: 190, height: 220, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" },
  videoWrap: { width: 220, height: 200, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  video: { width: "100%", height: "100%" },
  docRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 180, maxWidth: 220,
  },
  docName: { color: "#fff", marginLeft: 8, flex: 1, fontSize: 12 },
  metaRow: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 4, marginLeft: 5,
  },
  metaRowMedia: {
    position: "absolute", right: 0, bottom: 6, flexDirection: "row",
    alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  tickIcon: { marginRight: 4 },
  timeText: { color: "rgba(255,255,255,0.9)", fontSize: 11, marginRight: 4 },
  inputBar: { paddingTop: 8, backgroundColor: "transparent" },
  inputRow: {
    flexDirection: "row", paddingLeft: 10, paddingRight: 10,
    alignItems: "center", backgroundColor: "transparent",
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center", marginRight: 8,
    borderWidth: 1, borderColor: "rgba(148,163,184,0.35)",
  },
  input: {
    flex: 1, color: "#fff", paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, marginRight: 8,
    maxHeight: 140, borderWidth: 1, borderColor: "rgba(148,163,184,0.5)",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center",
  },
  imageViewerRoot: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center", alignItems: "center", height: "100%",
  },
  imageViewerClose: {
    position: "absolute", top: 50, right: 18, zIndex: 10, width: 40, height: 40,
    borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  imageViewerImage: { width: "100%", height: "85%" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetCard: {
    position: "absolute", left: 12, right: 12, bottom: 12,
    backgroundColor: "rgba(15, 23, 42, 0.9)", borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.4)", borderRadius: 18, padding: 14,
  },
  sheetTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  sheetGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  sheetTile: {
    width: "48%", borderRadius: 14, paddingVertical: 14, marginBottom: 10,
    alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(148,163,184,0.35)",
  },
  sheetTileText: { color: "#E5E7EB", marginTop: 6, fontSize: 13, fontWeight: "600" },
  sheetHint: { color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 4 },
});