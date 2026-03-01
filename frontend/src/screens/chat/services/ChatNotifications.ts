import AsyncStorage from '@react-native-async-storage/async-storage';

const UNREAD_KEY = 'chat_unread_counts';

let unreadCounts: Record<string, number> = {};
let activePeerUserId: string | null = null;
let lastSeenAt: Record<string, string> = {};
let lastDeliveredAt: Record<string, string> = {};

// conversation listeners
let conversationListeners: Array<() => void> = [];
export function subscribeConversationChanges(cb: () => void) {
  conversationListeners.push(cb);
  return () => {
    conversationListeners = conversationListeners.filter((x) => x !== cb);
  };
}
export function notifyConversationChanged() {
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
  notifyConversationChanged();
}

export function clearUnread(peerUserId: string) {
  unreadCounts[peerUserId] = 0;
  saveUnreadCounts();
  emitUnreadChange();
  notifyConversationChanged();
}

export function getUnread(peerUserId: string) {
  return unreadCounts[peerUserId] || 0;
}

export async function clearAllUnread() {
  unreadCounts = {};
  await AsyncStorage.removeItem(UNREAD_KEY);
  emitUnreadChange();
  notifyConversationChanged();
}

export function getUnreadChatCount(): number {
  return Object.values(unreadCounts).filter((c) => c > 0).length;
}

// ---- "Seen" logic ----
export function markMessagesSeenLocally(peerUserId: string) {
  lastSeenAt[peerUserId] = new Date().toISOString();
  notifyConversationChanged();
}
export function getLocalSeenAt(peerUserId: string): string | undefined {
  return lastSeenAt[peerUserId];
}

// ---- "Delivered" logic ----
// Called from App.tsx when push type='delivered' arrives
export function getLocalDeliveredAt(peerUserId: string): string | undefined {
  return lastDeliveredAt[peerUserId];
}

let deliveredMessageIds = new Set<string>();

export function markMessagesDeliveredLocally(_peerUserId: string, messageIds: string[] = []) {
  for (const id of messageIds) {
    if (id) deliveredMessageIds.add(String(id));
  }
  notifyConversationChanged();
}

export function isMessageDeliveredLocally(messageId?: string) {
  if (!messageId) return false;
  return deliveredMessageIds.has(String(messageId));
}