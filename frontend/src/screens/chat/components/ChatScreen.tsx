import React, { useEffect, useState, useCallback, useRef, useContext, memo } from "react";
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
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import NetInfo from "@react-native-community/netinfo";
import { Swipeable, TapGestureHandler } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@rneui/themed";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { v4 as uuidv4 } from "uuid";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import { pick, types } from "@react-native-documents/picker";
import Video from "react-native-video";
import FileViewer from "react-native-file-viewer";
import RNFS from "react-native-fs";
import { BlurView } from "@react-native-community/blur";
import EmojiSelector, { Categories } from "react-native-emoji-selector";
import { getSocket, disconnectSocket } from "../services/socket";
import AuthContext from "../../../auth/user/UserContext";
import {
  openDirectConversation,
  sendMessage,
  fetchThread,
  markDelivered,
  markSeen,
  reactToMessage,
  removeReaction,
  deleteForEveryone,
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
  addDeletedForMe,
  getDeletedForMe,
} from "../services/LocalChatCache";
import apiClient from "../../../auth/api-client/api_client";

type Item =
  | { type: "date"; id: string; dateKey: string }
  | { type: "msg"; id: string; msg: any };

const MAX_FILES = 10;
const MAX_SIZE = 50 * 1024 * 1024;
const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

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
    if (!map.has(k)) {
      map.set(k, m);
    } else {
      const ex = map.get(k);
      map.set(k, {
        ...ex,
        ...m,
        deliveredAt: ex.deliveredAt || m.deliveredAt,
        seenAt: ex.seenAt || m.seenAt,
        tickState:
          ex.seenAt || m.seenAt
            ? "seen"
            : ex.deliveredAt || m.deliveredAt
            ? "delivered"
            : "sent"
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};

const detectTypeFromMime = (mime?: string) => {
  const m = String(mime || "");
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  return "document";
};

// --- MESSAGE BUBBLE COMPONENT ---

interface MessageBubbleProps {
  msgId: string;
  fromUserId: string;
  plaintext: string;
  messageType: string;
  mediaUrl: string;
  mediaName: string;
  createdAt: string;
  tickState: string;
  isMe: boolean;
  hasReactions: boolean;
  reactionEmojis: string;
  reactionCounts: string;
  isHighlighted: boolean;  // ← ADD THIS
  onLongPress: (msgId: string, isMe: boolean, layout: any) => void;
  onImagePress: (type: string, url: string, name: string) => void;
}

const MessageBubble = memo(({
  msgId,
  plaintext,
  messageType,
  mediaUrl,
  mediaName,
  createdAt,
  tickState,
  isMe,
  hasReactions,
  reactionEmojis,
  reactionCounts,
  isHighlighted,  // ← ADD THIS
  onLongPress,
  onImagePress,
}: MessageBubbleProps) => {
  const bubbleRef = useRef<View>(null);
  const isMedia = messageType !== "text";

  // ← ADD THIS BLOCK
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const prevHighlighted = useRef(false);
  useEffect(() => {
    if (isHighlighted && !prevHighlighted.current) {
      highlightAnim.setValue(0);
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0.3, duration: 200, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(highlightAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]).start();
    }
    prevHighlighted.current = isHighlighted;
  }, [isHighlighted]);

  const highlightBg = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(99,102,241,0)', 'rgba(99,102,241,0.30)'],
  });

  const handleLongPress = () => {
    bubbleRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      onLongPress(msgId, isMe, { x: pageX, y: pageY, width, height });
    });
  };

  const handleImagePress = () => {
    onImagePress(messageType, mediaUrl, mediaName);
  };

  const renderTick = () => {
    if (tickState === "seen") return <Icon name="check-all" size={13} color="#2090af" style={styles.tickIcon} />;
    if (tickState === "delivered") return <Icon name="check-all" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    if (tickState === "sent") return <Icon name="check" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    return <Icon name="clock-outline" size={13} color="#a3a3a3" style={styles.tickIcon} />;
  };

  const renderReactions = () => {
    if (!hasReactions) return null;
    const emojis = reactionEmojis.split(',').filter(Boolean);
    const counts = reactionCounts.split(',').filter(Boolean).map(Number);
    const positionStyle = isMe ? { right: 16 } : { left: 16 };

    return (
      <View pointerEvents="none" style={[styles.reactionGlassBubble, positionStyle]}>
        {emojis.map((emoji, idx) => (
          <Text key={`${emoji}-${idx}`} style={styles.reactionGlassText}>
            {emoji}{counts[idx] > 1 ? ` ${counts[idx]}` : ""}
          </Text>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    if (messageType === "text") {
      return <Text style={styles.text}>{plaintext}</Text>;
    }
    if (!mediaUrl) return null;
    
    if (messageType === "image") {
      return (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
          <Pressable style={StyleSheet.absoluteFill} onPress={handleImagePress} android_ripple={{ color: "rgba(255,255,255,0.10)" }} />
        </View>
      );
    }
    
    if (messageType === "video") {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoWrap}>
            <Video 
  source={{ uri: mediaUrl }} 
  style={styles.video} 
  controls 
  resizeMode="cover"
  poster={mediaUrl.replace('.mp4', '_thumb.jpg')} // Or generate thumbnail
  posterResizeMode="cover"
  paused={false} // Or manage with state
/>
{messageType === 'video' ? (
  <Video 
    source={{ uri: mediaUrl }} 
    style={styles.video} 
    controls 
    resizeMode="cover"
    paused={false}
  />
) : (
  <Pressable style={StyleSheet.absoluteFill} onPress={handleImagePress}>
    <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />
  </Pressable>
)}
          </View>
        </View>
      );
    }
    
return (
  <View style={styles.mediaContainer}>
    <TouchableOpacity 
      onPress={handleImagePress} 
      activeOpacity={0.8}
      style={styles.docRow}
    >
      <Icon name="file-document-outline" size={22} color="#fff" />
      <Text style={styles.docName} numberOfLines={1}>{mediaName || "Document"}</Text>
      <Icon name="download-outline" size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
    </TouchableOpacity>
    <View style={styles.metaRow}>
      {isMe ? renderTick() : null}
      <Text style={styles.timeText}>{formatTime(createdAt)}</Text>
      {renderReactions()}
    </View>
  </View>
);
  };

return (
  <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
    <Animated.View style={{ backgroundColor: highlightBg, borderRadius: 14 }}>
      <TouchableOpacity
        ref={bubbleRef}
        activeOpacity={0.85}
        delayLongPress={320}
        onLongPress={handleLongPress}
      >
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
     
{isMedia ? (
  <>
    {renderContent()}
    {messageType !== 'document' && (
      <View style={styles.metaRowMedia}>
        {isMe ? renderTick() : null}
        <Text style={styles.timeText}>{formatTime(createdAt)}</Text>
        {renderReactions()}
      </View>
    )}
    {messageType === 'document' && (
      <View style={styles.metaRow}>
      
        {renderReactions()}
      </View>
    )}
  </>
) : (
            <>
              <View style={isMe ? styles.textBubbleMe : styles.textBubbleOther}>
                {renderContent()}
              </View>
              <View style={styles.metaRow}>
                {isMe ? renderTick() : null}
                <Text style={styles.timeText}>{formatTime(createdAt)}</Text>
                {renderReactions()}
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  </View>
);
}, (prevProps, nextProps) => {
  return (
    prevProps.msgId === nextProps.msgId &&
    prevProps.plaintext === nextProps.plaintext &&
    prevProps.tickState === nextProps.tickState &&
    prevProps.hasReactions === nextProps.hasReactions &&
    prevProps.reactionEmojis === nextProps.reactionEmojis &&
    prevProps.reactionCounts === nextProps.reactionCounts &&
    prevProps.mediaUrl === nextProps.mediaUrl &&
    prevProps.isHighlighted === nextProps.isHighlighted &&  // ← ADD THIS
    prevProps.onLongPress === nextProps.onLongPress &&
    prevProps.onImagePress === nextProps.onImagePress
  );
});

// --- BUBBLE GHOST FOR MODAL ---

function BubbleGhost({ m, isMe, newUrl }: { m: any; isMe: boolean; newUrl: string }) {
  const getMediaUrl = () => {
    const raw = String(m?.media?.url || "");
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `${newUrl}${raw.startsWith("/") ? "" : "/"}${raw}`;
  };
  
  const renderTick = () => {
    const s = m.tickState || "pending";
    if (s === "seen") return <Icon name="check-all" size={13} color="#2090af" style={styles.tickIcon} />;
    if (s === "delivered") return <Icon name="check-all" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    if (s === "sent") return <Icon name="check" size={13} color="#a3a3a3" style={styles.tickIcon} />;
    return <Icon name="clock-outline" size={13} color="#a3a3a3" style={styles.tickIcon} />;
  };
  
  const t = m.messageType || "text";
  const isMedia = t !== "text";
  const mediaUrl = getMediaUrl();

  const content = () => {
    if (t === "text") return <Text style={styles.text}>{m.plaintext}</Text>;
    if (!mediaUrl) return null;
    if (t === "image") {
      return (
        <View style={styles.mediaContainer}>
          <Image source={{ uri: mediaUrl }} style={styles.mediaImage} />
        </View>
      );
    }
    if (t === "video") {
      return (
        <View style={styles.mediaContainer}>
          <View style={styles.videoWrap}>
            <Video source={{ uri: mediaUrl }} style={styles.video} resizeMode="cover" paused />
          </View>
        </View>
      );
    }
    return (
      <View style={styles.mediaContainer}>
        <View style={styles.docRow}>
          <Icon name="file-document-outline" size={22} color="#fff" />
          <Text style={styles.docName} numberOfLines={1}>{m?.media?.name || "Document"}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
      {isMedia ? (
        <>
          {content()}
          <View style={styles.metaRowMedia}>
            {isMe ? renderTick() : null}
            <Text style={styles.timeText}>{formatTime(m.createdAt)}</Text>
          </View>
        </>
      ) : (
        <>
          <View style={isMe ? styles.textBubbleMe : styles.textBubbleOther}>
            {content()}
          </View>
          <View style={styles.metaRow}>
            {isMe ? renderTick() : null}
            <Text style={styles.timeText}>{formatTime(m.createdAt)}</Text>
          </View>
        </>
      )}
    </View>
  );
}

// --- ACTION MENU ---

interface ActiveMenu {
  msgId: string;
  isMe: boolean;
  msg: any;
  position: { x: number; y: number; width: number; height: number };
}

interface MsgActionMenuProps {
  menu: ActiveMenu;
  newUrl: string;
  myUserId: string;
  currentReaction?: string;
  onReact: (emoji: string) => void;
  onDeleteForEveryone?: () => void;
  onDeleteForMe: () => void;
  onDismiss: () => void;
  openEmojiPicker: () => void;
}

const MsgActionMenu = memo(({
  menu,
  newUrl,
  myUserId,
  onReact,
  onDeleteForEveryone,
  onDeleteForMe,
  onDismiss,
  openEmojiPicker,
}: MsgActionMenuProps) => {
  const popAnim = useRef(new Animated.Value(0)).current;
  const { width: SW, height: SH } = Dimensions.get("window");
  const PAD = 10;
  const RXN_BAR_H = 58;
  const RXN_BAR_W = REACTIONS.length * 46 + 64;
  const DEL_H = menu.isMe ? 104 : 52;

  useEffect(() => {
    Animated.spring(popAnim, { toValue: 1, useNativeDriver: true, tension: 240, friction: 15 }).start();
  }, []);

  const { x, y, width, height } = menu.position;

  const bubbleTop = Math.max(PAD + 8, y - 10);
  const rxnAbove = bubbleTop - RXN_BAR_H - 8;
  const rxnBelow = bubbleTop + height + 8;
  const rxnTop = rxnAbove >= PAD ? rxnAbove : rxnBelow;
  const rxnLeft = menu.isMe
    ? Math.max(PAD, x + width - RXN_BAR_W)
    : Math.min(x, SW - RXN_BAR_W - PAD);

  const afterBubble = bubbleTop + height + 8;
  const delBelowTop = rxnTop === rxnBelow ? rxnTop + RXN_BAR_H + 8 : afterBubble;
  const delAboveTop = bubbleTop - DEL_H - RXN_BAR_H - 12;
  const isBottomEdge = delBelowTop + DEL_H + PAD > SH;
  const delTop = isBottomEdge ? Math.max(PAD, delAboveTop) : delBelowTop;
  const delLeft = menu.isMe ? undefined : Math.min(x, SW - 214 - PAD);
  const delRight = menu.isMe ? SW - (x + width) : undefined;

  const sc = popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const op = popAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const ty = popAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={12}
          reducedTransparencyFallbackColor="rgba(2,6,23,0.88)"
        />
      </TouchableWithoutFeedback>
      <Animated.View
        pointerEvents="none"
        style={[
          mStyles.ghost,
          menu.isMe
            ? { right: SW - (x + width), alignItems: "flex-end" }
            : { left: x, alignItems: "flex-start" },
          { top: bubbleTop, opacity: op, transform: [{ scale: sc }] },
        ]}
      >
        <BubbleGhost m={menu.msg} isMe={menu.isMe} newUrl={newUrl} />
      </Animated.View>
      <Animated.View
        style={[
          mStyles.reactionBar,
          { top: rxnTop, left: rxnLeft, opacity: op, transform: [{ scale: sc }, { translateY: ty }] },
        ]}
      >
        {REACTIONS.map((emoji) => {
          const hasMyReaction = menu.msg.reactions?.some((r: any) => r.userId === myUserId && r.emoji === emoji);
          return (
            <TouchableOpacity
              key={emoji}
              onPress={() => onReact(emoji)}
              style={[
                mStyles.reactionBtn,
                hasMyReaction && mStyles.reactionBtnActive
              ]}
              activeOpacity={0.7}
            >
              <Text style={mStyles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          key="plus"
          onPress={openEmojiPicker}
          style={mStyles.reactionBtn}
          activeOpacity={0.7}
        >
          <Icon name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View
        style={[
          mStyles.deleteMenu,
          {
            top: delTop,
            left: delLeft,
            right: delRight,
            opacity: op,
            transform: [{ scale: sc }, { translateY: ty }],
          },
        ]}
      >
        <TouchableOpacity
          style={[mStyles.deleteItem, menu.isMe && mStyles.deleteItemBorder]}
          onPress={onDeleteForMe}
          activeOpacity={0.7}
        >
          <Icon name="delete-outline" size={16} color="#94a3b8" />
          <Text style={mStyles.deleteText}>Delete for me</Text>
        </TouchableOpacity>

                {menu.isMe && (
          <TouchableOpacity style={mStyles.deleteItem} onPress={onDeleteForEveryone} activeOpacity={0.7}>
            <Icon name="delete-sweep-outline" size={16} color="#f87171" />
            <Text style={[mStyles.deleteText, { color: "#f87171" }]}>Delete for everyone</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Modal>
  );
});

const mStyles = StyleSheet.create({
  ghost: { position: "absolute", maxWidth: "82%" },
  reactionBar: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: "rgba(15,23,42,0.96)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 18,
  },
  reactionBtn: {
    width: 42, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  reactionBtnActive: { backgroundColor: "rgba(99,102,241,0.38)" },
  reactionEmoji: { fontSize: 24 },
  deleteMenu: {
    position: "absolute",
    backgroundColor: "rgba(15,23,42,0.97)",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    minWidth: 214,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 18,
  },
  deleteItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 13, paddingHorizontal: 16, gap: 12,
  },
  deleteItemBorder: {
    borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.12)",
  },
  deleteText: { color: "#94a3b8", fontSize: 14, fontWeight: "500" },
});

const HighlightableRow = memo(({ isHighlighted, children }: { isHighlighted: boolean; children: React.ReactNode }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const prevHighlighted = useRef(false);

  useEffect(() => {
    if (isHighlighted && !prevHighlighted.current) {
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0.3, duration: 200, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]).start();
    }
    prevHighlighted.current = isHighlighted;
  }, [isHighlighted]);

  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(99,102,241,0)', 'rgba(99,102,241,0.30)'],
  });

  return (
    <Animated.View style={{ backgroundColor: bg, borderRadius: 10 }}>
      {children}
    </Animated.View>
  );
});

// --- MAIN SCREEN ---

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
  const [activeMenu, setActiveMenu] = useState<ActiveMenu | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [deletedForMe, setDeletedForMe] = useState<Set<string>>(new Set());
  const typingTimeout = useRef(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<{ msgId: string; isMe: boolean } | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const didInitialAutoScrollRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const resolvedPeerAvatar = String(peerAvatarUrl || avatarUrl || "");
  const [avatarFailed, setAvatarFailed] = useState(false);
const highlightAnim = useRef(new Animated.Value(0)).current;
  const baseUrl = apiClient.getBaseURL();
  const newUrl = baseUrl.replace(/\/api\/?$/, "");

const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
const bottomInset = useSharedValue(insets.bottom);

// Keep it in sync if insets change (rare but safe):
useEffect(() => {
  bottomInset.value = insets.bottom;
}, [insets.bottom]);

const fakeView = useAnimatedStyle(() => {
  const kbHeight = Math.abs(keyboardHeight.value);
  return {
    height: kbHeight > 0 ? kbHeight : bottomInset.value,
  };
});

  const socketRef = useRef(null);

  const activeSwipeableRef = useRef<string | null>(null);

    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, View>>(new Map());
  const flatListRef = useRef<FlatList>(null);

// Function to close others
const closeOtherSwipeables = (currentId: string) => {
  swipeableRefs.current.forEach((swipeable, id) => {
    if (id !== currentId && swipeable) {
      swipeable.close();
    }
  });
  activeSwipeableRef.current = currentId;
};

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) socket.connect();

    socket.emit("join", myUserId);
    if (conversationId) socket.emit("join-conversation", conversationId);

    socket.on("chat-message", (msg) => {
      setMessages(prev => dedupeMessages([...prev, normalizeServer([msg])[0]]));
    });

    socket.on("typing", ({ userId }) => {
      if (userId === peerUserId) setPeerTyping(true);
    });
    socket.on("stop-typing", ({ userId }) => {
      if (userId === peerUserId) setPeerTyping(false);
    });
    
    socket.on("msg-delivered", ({ msgId, userId }) => {
      setMessages(prev => prev.map(m => String(m._id) === msgId ? { ...m, deliveredAt: new Date().toISOString(), tickState: "delivered" } : m));
    });
    socket.on("msg-seen", ({ msgId, userId }) => {
      setMessages(prev => prev.map(m => String(m._id) === msgId ? { ...m, seenAt: new Date().toISOString(), tickState: "seen" } : m));
    });
    socket.on("msg-deleted", ({ msgId }) => {
      setMessages(prev => prev.filter(m => String(m._id) !== msgId));
    });
    socket.on("msg-reacted", ({ msgId, userId, emoji }) => {
      setMessages(prev =>
        prev.map(m =>
          String(m._id) === msgId
            ? {
                ...m,
                reactions: emoji
                  ? [...(m.reactions || []).filter(r => r.userId !== userId), { userId, emoji }]
                  : (m.reactions || []).filter(r => r.userId !== userId),
              }
            : m
        )
      );
    });

    return () => {
      socket.off("chat-message");
      socket.off("typing");
      socket.off("stop-typing");
      socket.off("msg-delivered");
      socket.off("msg-seen");
      socket.off("msg-deleted");
      socket.off("msg-reacted");
    };
  }, [myUserId, conversationId]);


  const handleDoubleTap = useCallback((msgId, isMe) => {
    const msg = messages.find(m => String(m._id) === msgId);
    if (!msg) return;
    const alreadyLiked = (msg.reactions || []).some(
      r => String(r.userId) === String(myUserId) && r.emoji === "❤️"
    );
    if (alreadyLiked) {
      removeReaction({ messageId: msgId });
    } else {
      reactToMessage({ messageId: msgId, emoji: "❤️" });
    }
  }, [messages, myUserId]);

  const handleInputChange = (val) => {
    setInput(val);
    if (socketRef.current && conversationId) {
      socketRef.current.emit("typing", {
        conversationId,
        userId: myUserId,
      });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketRef.current.emit("stop-typing", {
          conversationId,
          userId: myUserId,
        });
      }, 1500);
    }
  };

const scrollToBottom = useCallback((animated = false) => {
  // For inverted list, "bottom" is offset 0 (visual bottom)
  flatListRef.current?.scrollToOffset({ offset: 0, animated });
}, []);

  const showGlassyError = useCallback((msg: string) => {
    setGlassError(msg);
    setTimeout(() => setGlassError(null), 2600);
  }, []);

  const openImageViewerCb = useCallback((url: string) => { 
    setActiveImageUrl(url); 
    setImageViewerVisible(true); 
  }, []);

  const getMediaUrlCb = useCallback((m: any) => {
    const raw = String(m?.media?.url || "");
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    return `${newUrl}${raw.startsWith("/") ? "" : "/"}${raw}`;
  }, [newUrl]);

  const ensureCameraPerms = useCallback(async () => {
    if (Platform.OS !== "android") return true;
    const cam = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    const mic = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    return cam === PermissionsAndroid.RESULTS.GRANTED && mic === PermissionsAndroid.RESULTS.GRANTED;
  }, []);

const openDocInAppCb = useCallback(async (url: string, name?: string) => {
  try {
    const ext = (name?.split(".").pop() || "bin").toLowerCase();
    const filePath = `${RNFS.CachesDirectoryPath}/chat_${Date.now()}.${ext}`;
    const r = await RNFS.downloadFile({ fromUrl: url, toFile: filePath }).promise;
    console.log("Download result:", r);
    
   if (r.statusCode >= 200 && r.statusCode < 300) {
  await FileViewer.open(filePath, { 
    showOpenWithDialog: true,
    showAppsSuggestions: true,  // ← add this
  });
}else {
      showGlassyError("Failed to download document");
    }
  } catch (downloadError) {
    console.log("Download error:", downloadError);
    showGlassyError("Cannot download this document");
  }
}, [showGlassyError]);

const normalizeServer = useCallback(
  (serverMsgs: any[]) =>
    serverMsgs
      .map((m: any) => {
        const isMe = String(m.senderId) === String(myUserId);
        let tickState = "pending";
        if (isMe) {
          if (m.seenAt) tickState = "seen";
          else if (m.deliveredAt) tickState = "delivered";
          else tickState = "sent";
        } else tickState = "delivered";
        
        // Handle populated replyTo
        let replyToData = null;
        if (m.replyTo) {
          if (typeof m.replyTo === 'object') {
            // Already populated from backend
            replyToData = {
              _id: String(m.replyTo._id),
              senderId: String(m.replyTo.senderId || m.replyTo.fromUserId),
              text: String(m.replyTo.text || m.replyTo.plaintext || ""),
              messageType: m.replyTo.messageType || "text",
              media: m.replyTo.media || null,
            };
          } else {
            // Just the ID, will resolve in render
            replyToData = m.replyTo;
          }
        }
        
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
          reactions: m.reactions || [],
          deletedForEveryone: !!m.deletedForEveryone,
          replyTo: replyToData,
        };
      })
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  [myUserId]
);

  const buildItemsWithDateSeparators = useCallback(
    (msgs: any[]) => {
      const out: Item[] = [];
      let lastDate = "";
      for (const m of msgs) {
        if (deletedForMe.has(String(m._id))) continue;
        if (m.deletedForEveryone) continue;
        const dk = dateKey(m.createdAt);
        if (dk !== lastDate) {
          lastDate = dk;
          out.push({ type: "date", id: `date-${dk}`, dateKey: dk });
        }
        out.push({ type: "msg", id: `msg_${stableMessageKey(m)}`, msg: m });
      }
      return out;
    },
    [deletedForMe]
  );


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
  const built = buildItemsWithDateSeparators(messages);
  setItems([...built].reverse()); // inverted FlatList needs reversed data
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
      setMessages(dedupeMessages(normalizeServer(cached.map((m: any) => ({
        _id: m._id, senderId: m.senderId, receiverId: m.receiverId, text: m.text,
        messageType: m.messageType || "text", media: m.media || null, createdAt: m.createdAt,
        clientMessageId: m.clientMessageId, deliveredAt: m.deliveredAt, seenAt: m.seenAt,
      })))));
    } else { setMessages([]); }

    if (offline) return;
    try {
      const { data } = await fetchThread(String(conversationId), { limit: 200 });
      const serverMsgs = data?.messages || [];
      if (serverMsgs.length) {
        await saveThreadCacheV2(String(myUserId), String(conversationId), serverMsgs.map((m: any) => ({
          _id: String(m._id), conversationId: String(conversationId),
          senderId: String(m.senderId), receiverId: String(m.receiverId),
          text: String(m.text || ""), messageType: String(m.messageType || "text"),
          media: m.media || null, createdAt: m.createdAt, clientMessageId: m.clientMessageId,
          deliveredAt: m.deliveredAt || null, seenAt: m.seenAt || null,
        })));
        const normalizedServer = normalizeServer(serverMsgs);
        setMessages((prev) => {
          const serverClientIds = new Set(normalizedServer.map((m: any) => m.clientMessageId).filter(Boolean).map((x: any) => String(x)));
          const serverIds = new Set(normalizedServer.map((m: any) => String(m._id)));
          const stillPendingLocal = prev.filter((m: any) => {
            const isLocalId = String(m._id).startsWith("loc:");
            return isLocalId && !serverIds.has(String(m._id)) &&
              !(m.clientMessageId && serverClientIds.has(String(m.clientMessageId)));
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
          conversationId: String(conversationId), peerUserId: String(peerUserId),
          peerName: String(peerName || "Friend"), mood: String(peerMood || ""),
          lastText: previewText, lastAt: String(last.createdAt || new Date().toISOString()), unread: 0,
        });
        const incomingUndelivered = serverMsgs
          .filter((m: any) => String(m.receiverId) === String(myUserId) && !m.deliveredAt)
          .map((m: any) => String(m._id));
        if (incomingUndelivered.length) await markDelivered(incomingUndelivered);
        const incoming = serverMsgs.filter((m: any) => String(m.receiverId) === String(myUserId));
        if (incoming.length) {
          await markSeen({ conversationId: String(conversationId), peerUserId: String(peerUserId), lastSeenMessageId: String(incoming[incoming.length - 1]._id) });
        }
        notifyConversationChanged();
      }
    } catch (e) { 
      console.log("fetchThread failed", e); 
      notifyConversationChanged(); 
    }
  }, [conversationId, myUserId, peerUserId, peerName, peerMood, offline, normalizeServer]);

useEffect(() => {
  const unsub = navigation.addListener("focus", async () => {
    didInitialAutoScrollRef.current = false;
    await loadThread();
    // DON'T scroll here - let onContentSizeChange handle it
  });
  (async () => { 
    await loadThread(); 
    // DON'T scroll here either
  })();
  return unsub;
}, [navigation, loadThread]);

  useEffect(() => {
    if (socketRef.current && conversationId) {
      socketRef.current.emit("join-conversation", conversationId);
    }
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!conversationId || !myUserId || offline) return;
    const latestIncoming = messages
      .filter(m => m.toUserId === myUserId && !m.seenAt)
      .slice(-1)[0];

    if (latestIncoming) {
      markSeen({
        conversationId: String(conversationId),
        peerUserId: String(peerUserId),
        lastSeenMessageId: String(latestIncoming._id)
      }).catch(() => {});
    }
  }, [messages, conversationId, myUserId, peerUserId, offline]);

  useEffect(() => {
    if (!conversationId || !myUserId) return;
    (async () => {
      const ids = await getDeletedForMe(String(myUserId), String(conversationId));
      setDeletedForMe(ids);
    })();
  }, [myUserId, conversationId]);

 const uploadOne = useCallback(
  async (f: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append("files", {
      uri: f.uri,
      name: f.name || `file_${Date.now()}`,
      type: f.type || "application/octet-stream",
    } as any);

    const res = await apiClient.post("/chat/messages/upload-multiple", form, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log(res);
    

    const d = res?.data || {};
    if (!d?.files?.length) throw new Error("Upload failed");

    const media = d.files[0];
    return {
      messageType: media.messageType || detectTypeFromMime(media.mimeType),
      media,
    };
  },
  []
);

  const sendMediaMessage = useCallback(async (uploaded: { messageType: string; media: any }) => {
    if (!conversationId || !myUserId) return;
    const now = new Date().toISOString();
    const clientMessageId = uuidv4();
    const localId = `loc:${clientMessageId}`;
    setMessages((prev) => dedupeMessages([...prev, {
      _id: localId, fromUserId: String(myUserId), toUserId: String(peerUserId),
      plaintext: "", messageType: uploaded.messageType, media: uploaded.media,
      createdAt: now, clientMessageId, tickState: "pending", deliveredAt: null, seenAt: null,
    }]));
    await upsertThreadMessageV2(String(myUserId), String(conversationId), {
      _id: localId, conversationId: String(conversationId), senderId: String(myUserId), receiverId: String(peerUserId),
      text: "", messageType: uploaded.messageType, media: uploaded.media,
      createdAt: now, clientMessageId, deliveredAt: null, seenAt: null,
    });
    await upsertPreviewV2(String(myUserId), {
      conversationId: String(conversationId), peerUserId: String(peerUserId),
      peerName: String(peerName || "Friend"), mood: String(peerMood || ""),
      lastText: uploaded.messageType === "image" ? "📷 Photo" : uploaded.messageType === "video" ? "🎥 Video" : "📎 Document",
      lastAt: now, unread: 0,
    });
    notifyConversationChanged();
    const { data } = await sendMessage({
      conversationId: String(conversationId), receiverId: String(peerUserId),
      text: "", messageType: uploaded.messageType, media: uploaded.media,
      clientMessageId: String(clientMessageId), notifyUser: true,
    });
    const srv = data?.message;
    if (srv?._id) {
      setMessages((prev) => dedupeMessages(prev.map((mm) =>
        mm.clientMessageId === clientMessageId
          ? { ...mm, _id: String(srv._id), createdAt: srv.createdAt || mm.createdAt, media: srv.media || mm.media, messageType: srv.messageType || mm.messageType, tickState: srv.seenAt ? "seen" : srv.deliveredAt ? "delivered" : "sent", deliveredAt: srv.deliveredAt || null, seenAt: srv.seenAt || null }
          : mm
      )));
    }
  }, [conversationId, myUserId, peerUserId, peerName, peerMood]);

  const processAndSendFiles = useCallback(async (files: Array<{ uri: string; type?: string; name?: string; fileSize?: number }>) => {
    if (!files.length) return;
    if (offline) return showGlassyError("You're offline. Media upload needs internet.");
    if (files.length > MAX_FILES) return showGlassyError(`Select up to ${MAX_FILES} files only.`);
    if (files.find((f) => Number(f.fileSize || 0) > MAX_SIZE)) return showGlassyError("Each file must be <= 50MB.");
    try {
      setSendingMedia(true);
      for (const f of files) { const uploaded = await uploadOne(f); await sendMediaMessage(uploaded); }
      setTimeout(() => scrollToBottom(true), 80);
    } catch (e: any) { showGlassyError(e?.message || "Failed to send media"); }
    finally { setSendingMedia(false); }
  }, [offline, showGlassyError, uploadOne, sendMediaMessage, scrollToBottom]);

  const pickFromGallery = useCallback(async () => {
    try {
      setSheetOpen(false);
      const res = await launchImageLibrary({ mediaType: "mixed", selectionLimit: MAX_FILES, includeExtra: true });
      if (res.didCancel || !res.assets?.length) return;
      await processAndSendFiles(res.assets.map((a) => ({ uri: String(a.uri || ""), type: a.type, name: a.fileName || `media_${Date.now()}`, fileSize: a.fileSize })));
    } catch { showGlassyError("Could not open gallery"); }
  }, [processAndSendFiles, showGlassyError]);

  const openCameraPhoto = useCallback(async () => {
    try {
      setSheetOpen(false);
      const ok = await ensureCameraPerms();
      if (!ok) return showGlassyError("Camera permission denied");
      const res = await launchCamera({ mediaType: "photo", saveToPhotos: true });
      if (res.didCancel || !res.assets?.length) return;
      await processAndSendFiles(res.assets.map((a) => ({ uri: String(a.uri || ""), type: a.type, name: a.fileName || `photo_${Date.now()}.jpg`, fileSize: a.fileSize })));
    } catch { showGlassyError("Could not open camera"); }
  }, [ensureCameraPerms, processAndSendFiles, showGlassyError]);

  const openCameraVideo = useCallback(async () => {
    try {
      setSheetOpen(false);
      const ok = await ensureCameraPerms();
      if (!ok) return showGlassyError("Camera/Mic permission denied");
      const res = await launchCamera({ mediaType: "video", videoQuality: "high", saveToPhotos: true });
      if (res.didCancel || !res.assets?.length) return;
      await processAndSendFiles(res.assets.map((a) => ({ uri: String(a.uri || ""), type: a.type, name: a.fileName || `video_${Date.now()}.mp4`, fileSize: a.fileSize })));
    } catch { showGlassyError("Could not record video"); }
  }, [ensureCameraPerms, processAndSendFiles, showGlassyError]);

  const pickDocuments = useCallback(async () => {
    try {
      setSheetOpen(false);
      const docs = await pick({ allowMultiSelection: true, type: [types.allFiles] });
      if (!docs?.length) return;
      if (docs.length > MAX_FILES) return showGlassyError(`Select up to ${MAX_FILES} files only.`);
      await processAndSendFiles(docs.map((d: any) => ({ uri: d.uri, type: d.type, name: d.name || `doc_${Date.now()}`, fileSize: d.size })));
    } catch (e: any) {
      const code = e?.code || e?.name;
      if (code === "DOCUMENT_PICKER_CANCELED" || code === "OPERATION_CANCELED" || code === "AbortError") return;
      showGlassyError("Could not pick documents");
    }
  }, [processAndSendFiles, showGlassyError]);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

// Reset all swipeables when reply is set
const resetAllSwipes = useCallback(() => {
  swipeableRefs.current.forEach((swipeable) => {
    swipeable?.close?.();
  });
}, []);

// Update handleSwipeToReply to reset swipes
const handleSwipeToReply = useCallback((msgId: string) => {
  const msg = messages.find((m) => String(m._id) === msgId);
  if (msg) {
    setReplyToMessage(msg);
          resetAllSwipes();
    // Reset all swipe positions after a short delay
    // setTimeout(() => {
    //   resetAllSwipes();
    // }, 10);
  }
}, [messages, resetAllSwipes]);

// REPLACE scrollToMessage with this:
const scrollToMessage = useCallback((messageId: string) => {
  const builtItems = buildItemsWithDateSeparators(messages);
  const forwardIndex = builtItems.findIndex(item =>
    item.type === 'msg' && String(item.msg._id) === String(messageId)
  );
  if (forwardIndex === -1) { showGlassyError("Message not found"); return; }

  const invertedIndex = builtItems.length - 1 - forwardIndex;
  flatListRef.current?.scrollToIndex({ index: invertedIndex, animated: true, viewPosition: 0.5 });

  setHighlightedMessageId(messageId);
  setTimeout(() => setHighlightedMessageId(null), 1400);
}, [messages, buildItemsWithDateSeparators, showGlassyError]);

// Handle scroll failure
const onScrollToIndexFailed = useCallback((info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
  // Fallback: scroll to end then try again
  flatListRef.current?.scrollToEnd({ animated: true });
  setTimeout(() => {
    flatListRef.current?.scrollToIndex({
      index: info.index,
      animated: true,
    });
  }, 100);
}, []);

const send = useCallback(async () => {
  const text = input.trim();
  if (!text || !conversationId || !myUserId) return;
  
  const now = new Date().toISOString();
  const clientMessageId = uuidv4();
  const localId = `loc:${clientMessageId}`;
  
  // Store reply info before clearing
  const currentReplyTo = replyToMessage;
  
  setInput("");
  setReplyToMessage(null); // Clear immediately for UI
  
  setMessages((prev) => dedupeMessages([...prev, {
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
    replyTo: currentReplyTo?._id || null,
  }]));
  
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
    replyTo: currentReplyTo?._id || null,
  });
  
  await upsertPreviewV2(String(myUserId), {
    conversationId: String(conversationId), 
    peerUserId: String(peerUserId),
    peerName: String(peerName || "Friend"), 
    mood: String(peerMood || ""),
    lastText: currentReplyTo ? `↩️ ${text}` : text, 
    lastAt: now, 
    unread: 0,
  });
  
  notifyConversationChanged();
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
      replyTo: currentReplyTo?._id || null,
    });
    
    const srv = data?.message;
    if (srv?._id) {
      setMessages((prev) => dedupeMessages(prev.map((m) =>
        m.clientMessageId === clientMessageId
          ? { 
              ...m, 
              _id: String(srv._id), 
              createdAt: srv.createdAt || m.createdAt, 
              tickState: srv.seenAt ? "seen" : srv.deliveredAt ? "delivered" : "sent", 
              deliveredAt: srv.deliveredAt || null, 
              seenAt: srv.seenAt || null,
              replyTo: srv.replyTo || m.replyTo,
            }
          : m
      )));
    }
    // setTimeout(() => loadThread(), 600);
  } catch { 
    showGlassyError("Failed to send message"); 
  }
}, [
  input, conversationId, myUserId, peerUserId, peerName, peerMood, offline, 
  loadThread, scrollToBottom, showGlassyError, replyToMessage
]);

  const handleLongPress = useCallback((msgId: string, isMe: boolean, layout: any) => {
    const msg = messages.find((m: any) => String(m._id) === msgId);
    if (msg) {
      setActiveMenu({ msgId, isMe, msg, position: layout });
    }
  }, [messages]);

  const dismissMenu = useCallback(() => setActiveMenu(null), []);

  const handleReact = useCallback(async (emoji: string) => {
    if (!activeMenu) return;
    const msgId = activeMenu.msgId;
    dismissMenu();

    setMessages(prevMessages =>
      prevMessages.map(m => {
        if (String(m._id) !== msgId) return m;
        const myPrevReaction = (m.reactions || []).find((r: any) => String(r.userId) === String(myUserId));
        let newReactions;
        if (myPrevReaction && myPrevReaction.emoji === emoji) {
          newReactions = m.reactions.filter((r: any) => !(String(r.userId) === String(myUserId) && r.emoji === emoji));
        } else {
          newReactions = [
            ...m.reactions.filter((r: any) => String(r.userId) !== String(myUserId)),
            { userId: myUserId, emoji }
          ];
        }
        return { ...m, reactions: newReactions };
      })
    );

    try {
      const msgObj = messages.find((m: any) => String(m._id) === msgId);
      const myReaction = (msgObj?.reactions || []).find((r: any) => String(r.userId) === String(myUserId));
      if (myReaction && myReaction.emoji === emoji) {
        await removeReaction({ messageId: msgId });
      } else {
        await reactToMessage({ messageId: msgId, emoji });
      }
    } catch (e) {
      showGlassyError("Failed to sync reaction");
    }
  }, [activeMenu, myUserId, messages, dismissMenu, showGlassyError]);

  const handleDeleteForMe = useCallback(() => {
    if (!activeMenu) return;
    const msgId = activeMenu.msgId;
    dismissMenu();
    setDeletedForMe(prev => {
      const updated = new Set([...prev, msgId]);
      addDeletedForMe(String(myUserId), String(conversationId), msgId);
      return updated;
    });
    setMessages(prev => prev.filter(m => String(m._id) !== msgId));
  }, [activeMenu, conversationId, myUserId, dismissMenu]);

  const handleDeleteForEveryone = useCallback(async () => {
    if (!activeMenu) return;
    const msgId = activeMenu.msgId;
    dismissMenu();

    try {
      await deleteForEveryone({ messageId: msgId });
      await loadThread();
    } catch (e) {
      showGlassyError("Unable to delete for everyone.");
    }
  }, [activeMenu, loadThread, dismissMenu, showGlassyError]);

  const openEmojiPicker = useCallback(() => {
    if (!activeMenu) return;
    setEmojiPickerTarget({ msgId: activeMenu.msgId, isMe: activeMenu.isMe });
    setEmojiPickerVisible(true);
  }, [activeMenu]);

  const handleEmojiPickerSelect = useCallback((emoji: string) => {
    if (!emojiPickerTarget) return;
    setReactions(prev => ({
      ...prev,
      [emojiPickerTarget.msgId]: emoji,
    }));
    setEmojiPickerVisible(false);
    setEmojiPickerTarget(null);
    dismissMenu();
  }, [emojiPickerTarget, dismissMenu]);

  const handleImagePress = useCallback((type: string, url: string, name: string) => {
    if (type === 'image') openImageViewerCb(url);
    if (type === 'video') {}
    if (type === 'document') openDocInAppCb(url, name);
  }, [openImageViewerCb, openDocInAppCb]);

// ... (keep all imports and top code same until renderItem)
const renderItem = useCallback(({ item, index }: { item: Item; index: number }) => {
  if (item.type === "date") {
    return (
      <View style={styles.dateRow}>
        <Text style={styles.dateText}>{formatDateHeader(item.dateKey)}</Text>
      </View>
    );
  }

  const m = item.msg;
  const isMe = String(m.fromUserId) === String(myUserId);
  const isHighlighted = highlightedMessageId === String(m._id);

  const effectiveTickState = isMe && !m.seenAt && !m.deliveredAt &&
    (isMessageDeliveredLocally(String(m._id)) ||
      (m.clientMessageId && isMessageDeliveredLocally(String(m.clientMessageId))))
      ? "delivered"
      : m.tickState;

  const reactions = m.reactions || [];
  const hasReactions = reactions.length > 0;
  const grouped: Record<string, number> = {};
  reactions.forEach((r: any) => {
    grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
  });
  const reactionEmojis = Object.keys(grouped).join(',');
  const reactionCounts = Object.values(grouped).join(',');

  // Show reply preview for THIS message
// Show reply preview for THIS message
// In renderItem, replace the replyBubble section with this:

let replyBubble = null;
if (m.replyTo && m.replyTo !== null) {
  let repliedMsg = typeof m.replyTo === 'object' ? m.replyTo : null;
  const originalMsgId = typeof m.replyTo === 'object' ? m.replyTo._id : m.replyTo;
  
  if (!repliedMsg && typeof m.replyTo === 'string') {
    repliedMsg = messages.find(msg => String(msg._id) === String(m.replyTo));
  }
  
  if (repliedMsg) {
    const isRepliedMsgMine = String(repliedMsg.fromUserId || repliedMsg.senderId) === String(myUserId);
    const repliedMediaUrl = repliedMsg.media?.url ? 
      (repliedMsg.media.url.startsWith("http") ? repliedMsg.media.url : `${newUrl}${repliedMsg.media.url}`) 
      : null;
    
    replyBubble = (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => scrollToMessage(originalMsgId)}
       style={[
  styles.replyBubbleTouchable,
  { 
    alignSelf: isMe ? 'flex-end' : 'flex-start',
    // Match the bubble max width — no artificial constraint
  }
]}
      >
        <View style={styles.replyBubble}>
          {/* Left colored border */}
          <View style={[
            styles.replyBubbleLeftBorder, 
            { backgroundColor: isMe ? "#818cf8" : "#6366f1" }
          ]} />
          
          {/* Text content */}
          <View style={styles.replyBubbleContent}>
            <Text style={[
              styles.replySender, 
              { color: isMe ? "#818cf8" : "#60a5fa" }
            ]}>
              {isRepliedMsgMine ? "You" : (peerName || "Other")}
            </Text>
            <Text style={styles.replyContent} numberOfLines={1}>
              {repliedMsg.messageType === 'image' ? '📷 Photo' :
               repliedMsg.messageType === 'video' ? '🎥 Video' :
               repliedMsg.messageType === 'document' ? '📎 Document' :
               (repliedMsg.plaintext || repliedMsg.text || 'Message')}
            </Text>
          </View>
          
          {/* Thumbnail for media */}
          {repliedMsg.messageType !== 'text' && repliedMediaUrl && (
            <View style={styles.replyBubbleThumbnail}>
              <Image 
                source={{ uri: repliedMediaUrl }} 
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              {repliedMsg.messageType === 'video' && (
                <View style={{
                  ...StyleSheet.absoluteFillObject, 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(0,0,0,0.3)'
                }}>
                  <Icon name="play" size={10} color="#fff" />
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }
}

  // Animated reply icon - fades in as you swipe
  const renderReplyIcon = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    // Calculate opacity based on drag distance (0 to 80)
    const opacity = dragX.interpolate({
      inputRange: [0, 20, 60],
      outputRange: [0, 0.3, 1],
      extrapolate: 'clamp',
    });
    
    const scale = dragX.interpolate({
      inputRange: [0, 20, 60],
      outputRange: [0.3, 0.7, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.replyIconWrap, { opacity, transform: [{ scale }] }]}>
        <View style={styles.replyIconCircle}>
          <Icon name="reply" size={24} color="#fff" />
        </View>
      </Animated.View>
    );
  };

return (
  <View>
    <Swipeable
      ref={(ref) => {
        if (ref && m._id) swipeableRefs.current.set(String(m._id), ref);
      }}
      renderLeftActions={!isMe ? (prog, dragX) => renderReplyIcon(prog, dragX) : null}
      renderRightActions={isMe ? (prog, dragX) => {
        const negDragX = Animated.multiply(dragX, new Animated.Value(-1));
        return renderReplyIcon(prog, negDragX);
      } : null}
      onSwipeableLeftOpen={!isMe ? () => handleSwipeToReply(m._id) : undefined}
      onSwipeableRightOpen={isMe ? () => handleSwipeToReply(m._id) : undefined}
      leftThreshold={60}
      rightThreshold={60}
      friction={2}
      overshootFriction={8}
      overshootLeft={false}
      overshootRight={false}
    >
    <TapGestureHandler onActivated={() => handleDoubleTap(m._id, isMe)} numberOfTaps={2}>
  <View style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
    {replyBubble}
     <MessageBubble
  msgId={String(m._id)}
  fromUserId={String(m.fromUserId)}
  plaintext={String(m.plaintext || "")}
  messageType={String(m.messageType || "text")}
  mediaUrl={getMediaUrlCb(m)}
  mediaName={String(m?.media?.name || "")}
  createdAt={String(m.createdAt)}
  tickState={String(effectiveTickState)}
  isMe={isMe}
  isHighlighted={isHighlighted}
  hasReactions={hasReactions}
  reactionEmojis={reactionEmojis}
  reactionCounts={reactionCounts}
  onLongPress={handleLongPress}
  onImagePress={handleImagePress}
/>
  </View>
</TapGestureHandler>
    </Swipeable>
    </View>
  );
}, [myUserId, handleLongPress, getMediaUrlCb, handleImagePress, handleSwipeToReply, 
    handleDoubleTap, messages, peerName, resetAllSwipes, highlightedMessageId]);

  const keyExtractor = useCallback((item: Item) => item.id, []);

// 4. Replace your entire return JSX structure with this:
return (
  <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
    {/* Decorative — absolutely positioned */}

    {!!glassError && (
      <View style={styles.errorCard}>
        <Icon name="alert-circle-outline" size={18} color="#FEE2E2" />
        <Text style={styles.errorText}>{glassError}</Text>
      </View>
    )}

    {/* Messages + input in a plain flex column */}
    <View style={{ flex: 1 }}>
      
      {/* Top bar + FlatList */}
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

        {peerTyping && (
          <Text style={{ color: '#fff', fontStyle: 'italic', marginLeft: 32 }}>
            {peerName || "Friend"} is typing...
          </Text>
        )}

        <FlatList
          ref={flatListRef}
          onScrollToIndexFailed={onScrollToIndexFailed}
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          inverted={true}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          initialNumToRender={20}
          windowSize={10}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          onScroll={(e) => {
            isNearBottomRef.current = e.nativeEvent.contentOffset.y < 100;
          }}
          scrollEventThrottle={16}
        />
      </View>

      {/* Input bar */}
      <View style={styles.inputBar}>
        {replyToMessage && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => replyToMessage._id && scrollToMessage(replyToMessage._id)}
            style={styles.replyPreviewContainer}
          >
            <View style={styles.replyPreviewLeftBorder} />
            {replyToMessage.messageType !== 'text' && replyToMessage.media?.url && (
              <View style={styles.replyPreviewThumbnail}>
                {replyToMessage.messageType === 'image' ? (
                  <Image source={{ uri: getMediaUrlCb(replyToMessage) }} style={styles.replyPreviewThumbImage} />
                ) : replyToMessage.messageType === 'video' ? (
                  <View style={styles.replyPreviewThumbVideo}>
                    <Image source={{ uri: getMediaUrlCb(replyToMessage) }} style={styles.replyPreviewThumbImage} blurRadius={2} />
                    <View style={styles.replyPreviewPlayIcon}>
                      <Icon name="play" size={12} color="#fff" />
                    </View>
                  </View>
                ) : null}
              </View>
            )}
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewName} numberOfLines={1}>
                {String(replyToMessage.fromUserId) === String(myUserId) ? "You" : peerName}
              </Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyToMessage.messageType === 'image' ? '📷 Photo' :
                 replyToMessage.messageType === 'video' ? '🎥 Video' :
                 replyToMessage.messageType === 'document' ? '📎 Document' :
                 replyToMessage.plaintext || 'Message'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.replyPreviewClose}
              onPress={(e) => { e.stopPropagation(); setReplyToMessage(null); resetAllSwipes(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, replyToMessage && styles.inputWithReply]}
            placeholder={offline ? "Offline: message will stay local" : "Type a message"}
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={handleInputChange}
            multiline
          />
          {sendingMedia ? (
            <View style={styles.sendBtn}><ActivityIndicator size="small" color="#fff" /></View>
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

      {/* ✅ This is the magic — a Reanimated view that grows/shrinks 
          perfectly in sync with the keyboard, zero JS delay */}
      <Reanimated.View style={[fakeView, { backgroundColor: "#020617" }]} />

    </View>

    {/* Modals — unchanged */}
    <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
      <View style={styles.imageViewerRoot}>
        <TouchableOpacity style={styles.imageViewerClose} onPress={() => setImageViewerVisible(false)}>
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Image source={{ uri: activeImageUrl }} style={styles.imageViewerImage} resizeMode="contain" />
      </View>
    </Modal>

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

    {activeMenu && (
      <MsgActionMenu
        menu={activeMenu}
        newUrl={newUrl}
        myUserId={myUserId}
        currentReaction={reactions[activeMenu.msgId]}
        onReact={handleReact}
        onDeleteForEveryone={activeMenu.isMe ? handleDeleteForEveryone : undefined}
        onDeleteForMe={handleDeleteForMe}
        onDismiss={dismissMenu}
        openEmojiPicker={openEmojiPicker}
      />
    )}

    <Modal visible={emojiPickerVisible} transparent animationType="slide" onRequestClose={() => setEmojiPickerVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' }}>
        <View style={{ backgroundColor: '#192134', padding: 8, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
          <EmojiSelector
            onEmojiSelected={handleEmojiPickerSelect}
            showSearchBar showTabs showHistory
            category={Categories.all}
            columns={8}
          />
        </View>
      </View>
    </Modal>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  root: { flex: 1, backgroundColor: "#020617" },
  innerContainer: { flex: 1, backgroundColor: "#020617" },
  replyBubbleTouchable: {
  marginBottom: 2,
  marginTop: 2,
  maxWidth: '80%',  // Match msgRow bubble max width
},

 replyBubble: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: "rgba(255,255,255,0.08)",
  borderRadius: 8,
  paddingVertical: 6,
  paddingHorizontal: 8,
  minHeight: 36,
  width: '100%',   // ← fill the touchable width
},
  
  replyBubbleLeftBorder: {
    width: 3,
    alignSelf: 'stretch', // Full height border
    borderRadius: 2,
    marginRight: 8,
  },
  
  replyBubbleContent: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0, // Important for text truncation
  },
  
  replyBubbleThumbnail: {
    width: 28,
    height: 28,
    borderRadius: 4,
    marginLeft: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  
  replySender: { 
    fontSize: 12, 
    fontWeight: "600",
    marginBottom: 1,
  },
  
  replyContent: { 
    fontSize: 12, 
    color: "#cbd5e1",
    lineHeight: 16,
  },
   replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.6)',
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: '85%', // Prevent too wide
    alignSelf: 'flex-start', // Left align like WhatsApp
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.15)",
  },  
  replyPreviewThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  
  replyPreviewThumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  
  replyPreviewThumbVideo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  replyPreviewPlayIcon: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  replyPreviewContent: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0, // Important for text truncation
  },
  
  replyPreviewName: {
    color: "#6e70e5", 
    fontSize: 13, 
    fontWeight: "600",
    marginBottom: 2,
  },
  
  replyPreviewText: { 
    color: "#b7bfc9", 
    fontSize: 13,
    lineHeight: 16,
  },
  
  replyPreviewClose: {
    padding: 4,
    marginLeft: 8,
    borderRadius: 12,
  },

   highlightedMessageContainer: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    transform: [{ scale: 1.02 }],
  },

  baseBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: "#020617" },
  glowTop: { position: "absolute", top: -120, left: -40, width: 220, height: 220, borderRadius: 220, backgroundColor: "rgba(59, 130, 246, 0.22)" },
  glowBottom: { position: "absolute", bottom: -140, right: -40, width: 240, height: 240, borderRadius: 240, backgroundColor: "rgba(168, 85, 247, 0.22)" },
  errorCard: { position: "absolute", top: 16, left: 12, right: 12, zIndex: 20, flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 14, backgroundColor: "rgba(127, 29, 29, 0.45)", borderWidth: 1, borderColor: "rgba(248, 113, 113, 0.5)" },
  errorText: { color: "#FEE2E2", marginLeft: 8, fontSize: 12, flex: 1 },
container: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 1, paddingVertical: 6, marginTop: 0 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(148,163,184,0.35)", marginRight: 8 },
  titlePressable: { flex: 1, marginLeft: 12, marginRight: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center" },
  headerAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10, borderWidth: 1, borderColor: "rgba(148,163,184,0.35)", backgroundColor: "rgba(255,255,255,0.08)" },
  headerAvatarFallback: { width: 34, height: 34, borderRadius: 17, marginRight: 10, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(148,163,184,0.35)" },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 },
  listContent: { paddingVertical: 8 },
  dateRow: { alignItems: "center", marginVertical: 10 },
  dateText: { color: "#cbd5e1", fontSize: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(148,163,184,0.25)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: "hidden" },
  msgRow: { width: "100%", flexDirection: "row", marginBottom: 8 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  bubble: { paddingHorizontal: 0, paddingVertical: 0, maxWidth: "100%", minWidth: 5, position: "relative", overflow: "hidden" },
  bubbleMe: { backgroundColor: "transparent" },
  bubbleOther: { backgroundColor: "transparent" },
  textBubbleMe: { backgroundColor: "#4f46e5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  textBubbleOther: { backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  text: { color: "#fff", flexShrink: 1, flexWrap: "wrap" },
  mediaContainer: { paddingBottom: 0 },
  mediaImage: { width: 190, height: 220, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" },
videoWrap: { 
  width: 220, 
  height: 200, 
  borderRadius: 12, 
  overflow: "hidden", 
  backgroundColor: "#000"  // ← Good, but video needs explicit sizing
},
video: { 
  width: "100%", 
  height: "100%"  // ← This works, but add backgroundColor
},
docRow: { 
  flexDirection: "row", 
  alignItems: "center", 
  backgroundColor: "rgba(255,255,255,0.08)", 
  borderRadius: 10, 
  paddingHorizontal: 10, 
  paddingVertical: 10,  // ← increased from 8
  minWidth: 180, 
  maxWidth: 220 
},
  docName: { color: "#fff", marginLeft: 8, flex: 1, fontSize: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 4, marginLeft: 5 },
  metaRowMedia: { position: "absolute", right: 0, bottom: 6, flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  tickIcon: { marginRight: 4 },
  timeText: { color: "rgba(255,255,255,0.9)", fontSize: 11, marginRight: 4 },
  inputBar: {
  paddingTop: 8,
  paddingBottom: 20,  // iOS needs home bar gap
  backgroundColor: "#020617",
  borderTopWidth: 1,
  borderTopColor: "rgba(148,163,184,0.12)",
},
inputRow: { 
  flexDirection: "row", 
  paddingLeft: 10, 
  paddingRight: 10, 
  alignItems: "center", 
  backgroundColor: "transparent"  // ✅ this one is fine — parent handles bg
},
  attachBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: "rgba(148,163,184,0.35)" },
  input: { flex: 1, color: "#fff", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, marginRight: 8, maxHeight: 140, borderWidth: 1, borderColor: "rgba(148,163,184,0.5)" },
  sendBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },
  imageViewerRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", justifyContent: "center", alignItems: "center", height: "100%" },
  imageViewerClose: { position: "absolute", top: 50, right: 18, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  imageViewerImage: { width: "100%", height: "85%" },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheetCard: { position: "absolute", left: 12, right: 12, bottom: 12, backgroundColor: "rgba(15, 23, 42, 0.9)", borderWidth: 1, borderColor: "rgba(148, 163, 184, 0.4)", borderRadius: 18, padding: 14 },
  sheetTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  sheetGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  sheetTile: { width: "48%", borderRadius: 14, paddingVertical: 14, marginBottom: 10, alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(148,163,184,0.35)" },
  sheetTileText: { color: "#E5E7EB", marginTop: 6, fontSize: 13, fontWeight: "600" },
  sheetHint: { color: "#94A3B8", fontSize: 12, textAlign: "center", marginTop: 4 },
  // Add to your StyleSheet.create:

// Reply swipe action styles (icon that appears while swiping)
replyActionContainer: {
  justifyContent: 'center',
  alignItems: 'center',
  width: 80,
  backgroundColor: 'transparent',
},
replyActionIcon: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: '#6366f1',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: "#6366f1",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
  elevation: 5,
},

// Updated reply preview in INPUT BAR (WhatsApp style)
  reactionGlassBubble: {
    position: "absolute",
    bottom: 10,
    left: -5,
    maxHeight: 25,
    maxWidth: 20,
    padding: 3,
    backgroundColor: "rgba(36,41,75,0.76)",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    zIndex: 30,
  },
  reactionGlassText: {
    fontSize: 10,
    color: "#fff",
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.17)',
    borderLeftWidth: 3,
    borderLeftColor: "#6366f1",
    marginBottom: 6,
    borderRadius: 9,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  replyText: { color: "#fff", fontSize: 13, flex: 1, marginRight: 8 },
  // Reply preview in CHAT BUBBLE (what this msg is replying to)
inputWithReply: {
  borderColor: "rgba(99,102,241,0.5)",
  backgroundColor: "rgba(99,102,241,0.08)",
},
// Reply icon that appears while swiping
replyIconWrap: {
  justifyContent: 'center',
  alignItems: 'center',
  width: 70,
  height: '100%',
  backgroundColor: 'transparent',
},
replyIconCircle: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#6366f1',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: "#6366f1",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 3,
},
});