import AsyncStorage from "@react-native-async-storage/async-storage";

export type CachedConversationPreview = {
  conversationId: string;
  peerUserId: string;
  peerName: string;
  mood?: string;
  lastText: string;
  lastAt: string;
  unread: number;
  updatedAt: string;
};

export type CachedChatMessage = {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
  clientMessageId?: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
};

const PREVIEWS_KEY = (myUserId: string) => `CHAT_CACHE_V2:PREVIEWS:${myUserId}`;
const THREAD_KEY = (myUserId: string, conversationId: string) =>
  `CHAT_CACHE_V2:THREAD:${myUserId}:${conversationId}`;

function sortByDateAsc<T extends { createdAt: string }>(arr: T[]) {
  return [...arr].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function sortByLastAtDesc<T extends { lastAt: string }>(arr: T[]) {
  return [...arr].sort(
    (a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
  );
}

/* -------------------- Previews -------------------- */
export async function saveConversationPreviews(
  myUserId: string,
  previews: Omit<CachedConversationPreview, "updatedAt">[]
) {
  const withUpdated = previews.map((p) => ({
    ...p,
    updatedAt: new Date().toISOString(),
  }));
  await AsyncStorage.setItem(PREVIEWS_KEY(myUserId), JSON.stringify(sortByLastAtDesc(withUpdated)));
}

export async function loadConversationPreviews(
  myUserId: string
): Promise<CachedConversationPreview[]> {
  const raw = await AsyncStorage.getItem(PREVIEWS_KEY(myUserId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortByLastAtDesc(parsed) : [];
  } catch {
    return [];
  }
}

export async function upsertConversationPreview(
  myUserId: string,
  preview: Omit<CachedConversationPreview, "updatedAt">
) {
  const current = await loadConversationPreviews(myUserId);
  const idx = current.findIndex((x) => x.conversationId === preview.conversationId);

  const next: CachedConversationPreview = {
    ...preview,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) current[idx] = next;
  else current.push(next);

  await AsyncStorage.setItem(PREVIEWS_KEY(myUserId), JSON.stringify(sortByLastAtDesc(current)));
}

/* -------------------- Threads -------------------- */
export async function saveThreadMessages(
  myUserId: string,
  conversationId: string,
  messages: CachedChatMessage[]
) {
  const dedup = new Map<string, CachedChatMessage>();
  for (const m of messages) dedup.set(String(m._id), m);
  const list = sortByDateAsc(Array.from(dedup.values()));
  await AsyncStorage.setItem(THREAD_KEY(myUserId, conversationId), JSON.stringify(list));
}

export async function loadThreadMessages(
  myUserId: string,
  conversationId: string
): Promise<CachedChatMessage[]> {
  const raw = await AsyncStorage.getItem(THREAD_KEY(myUserId, conversationId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortByDateAsc(parsed) : [];
  } catch {
    return [];
  }
}

export async function upsertThreadMessage(
  myUserId: string,
  conversationId: string,
  message: CachedChatMessage
) {
  const current = await loadThreadMessages(myUserId, conversationId);
  const idx = current.findIndex((x) => String(x._id) === String(message._id));
  if (idx >= 0) current[idx] = message;
  else current.push(message);
  await saveThreadMessages(myUserId, conversationId, current);
}

export async function clearAllChatCache(myUserId: string) {
  const keys = await AsyncStorage.getAllKeys();
  const prefixA = `CHAT_CACHE_V2:PREVIEWS:${myUserId}`;
  const prefixB = `CHAT_CACHE_V2:THREAD:${myUserId}:`;
  const toDelete = keys.filter((k) => k === prefixA || k.startsWith(prefixB));
  if (toDelete.length) await AsyncStorage.multiRemove(toDelete);
}