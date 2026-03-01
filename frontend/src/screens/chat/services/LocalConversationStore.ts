import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocalConversationPreview = {
  peerUserId: string;
  lastText: string;
  lastAt: string; // ISO string
  updatedAt: string; // ISO string for bookkeeping
};

const KEY = (userId: string, deviceId: string) => `CHAT_PREVIEWS:${userId}:${deviceId}`;

async function readMap(
  userId: string,
  deviceId: string
): Promise<Record<string, LocalConversationPreview>> {
  const raw = await AsyncStorage.getItem(KEY(userId, deviceId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

async function writeMap(
  userId: string,
  deviceId: string,
  map: Record<string, LocalConversationPreview>
) {
  await AsyncStorage.setItem(KEY(userId, deviceId), JSON.stringify(map));
}

/**
 * Upsert single preview for a peer.
 */
export async function upsertConversationPreview(
  userId: string,
  deviceId: string,
  input: {
    peerUserId: string;
    lastText?: string;
    lastAt?: string;
  }
) {
  const peerUserId = String(input.peerUserId || "").trim();
  if (!userId || !deviceId || !peerUserId) return;

  const map = await readMap(userId, deviceId);
  const prev = map[peerUserId];

  const nextLastAt =
    input.lastAt ??
    prev?.lastAt ??
    new Date().toISOString();

  const next: LocalConversationPreview = {
    peerUserId,
    lastText: String(input.lastText ?? prev?.lastText ?? ""),
    lastAt: String(nextLastAt),
    updatedAt: new Date().toISOString(),
  };

  map[peerUserId] = next;
  await writeMap(userId, deviceId, map);
}

/**
 * Bulk upsert for faster sync after API fetch.
 */
export async function bulkUpsertConversationPreviews(
  userId: string,
  deviceId: string,
  items: Array<{
    peerUserId: string;
    lastText?: string;
    lastAt?: string;
  }>
) {
  if (!userId || !deviceId || !Array.isArray(items) || items.length === 0) return;

  const map = await readMap(userId, deviceId);

  for (const item of items) {
    const peerUserId = String(item?.peerUserId || "").trim();
    if (!peerUserId) continue;

    const prev = map[peerUserId];
    const lastAt = String(item.lastAt ?? prev?.lastAt ?? new Date().toISOString());

    map[peerUserId] = {
      peerUserId,
      lastText: String(item.lastText ?? prev?.lastText ?? ""),
      lastAt,
      updatedAt: new Date().toISOString(),
    };
  }

  await writeMap(userId, deviceId, map);
}

/**
 * Returns list sorted by lastAt desc.
 */
export async function listConversationPreviews(
  userId: string,
  deviceId: string
): Promise<LocalConversationPreview[]> {
  if (!userId || !deviceId) return [];

  const map = await readMap(userId, deviceId);
  const list = Object.values(map);

  list.sort(
    (a, b) =>
      new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
  );

  return list;
}

/**
 * Optional: clear all cached previews for this user/device.
 */
export async function clearConversationPreviews(userId: string, deviceId: string) {
  if (!userId || !deviceId) return;
  await AsyncStorage.removeItem(KEY(userId, deviceId));
}