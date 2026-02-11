import AsyncStorage from '@react-native-async-storage/async-storage';

const UNREAD_KEY = 'chat_unread_counts';

let unreadCounts: Record<string, number> = {};
let activePeerUserId: string | null = null;
let lastSeenAt: Record<string, string> = {};

// conversation listeners
let conversationListeners: Array<() => void> = [];
// ChatNotifications.ts
export function subscribeConversationChanges(cb: () => void) {
  console.log("[chat] subscribeConversationChanges attached");
  conversationListeners.push(cb);
  return () => {
    conversationListeners = conversationListeners.filter((x) => x !== cb);
  };
}
export function notifyConversationChanged() {
  console.log("[chat] notifyConversationChanged fired");
  conversationListeners.forEach((cb) => cb());
}

// unread listeners
let unreadListeners: Array<() => void> = [];
function emitUnreadChange() {
  unreadListeners.forEach((cb) => cb());
}
export function subscribeUnreadChanges(cb: () => void) {
  unreadListeners.push(cb);
  return () => {
    unreadListeners = unreadListeners.filter((x) => x !== cb);
  };
}

// ---- Active chat helpers ----
export function setActiveChatPeer(peerUserId: string | null) {
  activePeerUserId = peerUserId;
}
export function getActiveChatPeer() {
  return activePeerUserId;
}

// ---- Unread badge ----
export async function loadChatNotificationState() {
  try {
    const stored = await AsyncStorage.getItem(UNREAD_KEY);
    unreadCounts = stored ? JSON.parse(stored) : {};
  } catch {
    unreadCounts = {};
  }
}
async function saveUnreadCounts() {
  await AsyncStorage.setItem(UNREAD_KEY, JSON.stringify(unreadCounts));
}

export function notifyIncoming(peerUserId: string) {
  if (activePeerUserId === peerUserId) return;
  unreadCounts[peerUserId] = (unreadCounts[peerUserId] || 0) + 1;
  saveUnreadCounts();
  emitUnreadChange();
  notifyConversationChanged(); // ✅ refresh chat list
}

export function clearUnread(peerUserId: string) {
  unreadCounts[peerUserId] = 0;
  saveUnreadCounts();
  emitUnreadChange();
  notifyConversationChanged(); // ✅ refresh chat list
}

export function getUnread(peerUserId: string) {
  return unreadCounts[peerUserId] || 0;
}

export async function clearAllUnread() {
  unreadCounts = {};
  await AsyncStorage.removeItem(UNREAD_KEY);
  emitUnreadChange();
  notifyConversationChanged(); // ✅ refresh chat list
}

// ---- "Seen" logic ----
export function markMessagesSeenLocally(peerUserId: string) {
  lastSeenAt[peerUserId] = new Date().toISOString();
}
export function getLocalSeenAt(peerUserId: string): string | undefined {
  return lastSeenAt[peerUserId];
}

// Add this function near getUnread
export function getUnreadChatCount(): number {
  return Object.values(unreadCounts).filter((c) => c > 0).length;
}