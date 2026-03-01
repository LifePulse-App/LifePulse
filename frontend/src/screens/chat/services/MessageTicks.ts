import AsyncStorage from "@react-native-async-storage/async-storage";

export type TickState = "pending" | "sent" | "delivered" | "seen";

export type TickRecord = {
  clientMessageId: string;
  state: TickState;
  serverAcceptedAt?: string;
  deliveredAt?: string;
  seenAt?: string;
  updatedAt: string;
};

type TickMap = Record<string, TickRecord>;

const KEY_PREFIX = "E2EE_TICKS_V1";
const MAX_PER_CONVERSATION = 3000;

const keyOf = (myUserId: string, conversationId: string) =>
  `${KEY_PREFIX}:${String(myUserId)}:${String(conversationId)}`;

function nowIso() {
  return new Date().toISOString();
}

function rank(state: TickState): number {
  // monotonic order
  switch (state) {
    case "pending":
      return 0;
    case "sent":
      return 1;
    case "delivered":
      return 2;
    case "seen":
      return 3;
    default:
      return 0;
  }
}

function safeParse(raw: string | null): TickMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as TickMap;
  } catch {
    return {};
  }
}

async function loadMap(myUserId: string, conversationId: string): Promise<TickMap> {
  const raw = await AsyncStorage.getItem(keyOf(myUserId, conversationId));
  return safeParse(raw);
}

async function saveMap(myUserId: string, conversationId: string, map: TickMap) {
  await AsyncStorage.setItem(keyOf(myUserId, conversationId), JSON.stringify(map));
}

function compactIfNeeded(map: TickMap): TickMap {
  const entries = Object.entries(map);
  if (entries.length <= MAX_PER_CONVERSATION) return map;

  entries.sort((a, b) => {
    const ta = new Date(a[1].updatedAt || a[1].seenAt || a[1].deliveredAt || a[1].serverAcceptedAt || 0).getTime();
    const tb = new Date(b[1].updatedAt || b[1].seenAt || b[1].deliveredAt || b[1].serverAcceptedAt || 0).getTime();
    return tb - ta; // newest first
  });

  const keep = entries.slice(0, MAX_PER_CONVERSATION);
  return Object.fromEntries(keep);
}

function mergeState(prev: TickRecord | undefined, incomingState: TickState): TickState {
  if (!prev) return incomingState;
  return rank(incomingState) >= rank(prev.state) ? incomingState : prev.state;
}

async function upsertTick(
  myUserId: string,
  conversationId: string,
  clientMessageId: string,
  patch: Partial<TickRecord> & { state?: TickState }
) {
  if (!clientMessageId) return;

  const map = await loadMap(myUserId, conversationId);
  const prev = map[clientMessageId];

  const nextState = patch.state ? mergeState(prev, patch.state) : prev?.state ?? "pending";

  const next: TickRecord = {
    clientMessageId,
    state: nextState,
    serverAcceptedAt: patch.serverAcceptedAt ?? prev?.serverAcceptedAt,
    deliveredAt: patch.deliveredAt ?? prev?.deliveredAt,
    seenAt: patch.seenAt ?? prev?.seenAt,
    updatedAt: nowIso(),
  };

  // keep timestamp consistency
  if (next.state === "delivered" && !next.deliveredAt) next.deliveredAt = nowIso();
  if (next.state === "seen") {
    if (!next.deliveredAt) next.deliveredAt = nowIso();
    if (!next.seenAt) next.seenAt = nowIso();
  }
  if ((next.state === "sent" || next.state === "delivered" || next.state === "seen") && !next.serverAcceptedAt) {
    next.serverAcceptedAt = nowIso();
  }

  map[clientMessageId] = next;
  await saveMap(myUserId, conversationId, compactIfNeeded(map));
}

export async function setPendingTick(
  myUserId: string,
  conversationId: string,
  clientMessageId: string
) {
  await upsertTick(myUserId, conversationId, clientMessageId, {
    state: "pending",
  });
}

export async function setSentTick(
  myUserId: string,
  conversationId: string,
  clientMessageId: string,
  serverAcceptedAt?: string
) {
  await upsertTick(myUserId, conversationId, clientMessageId, {
    state: "sent",
    serverAcceptedAt: serverAcceptedAt || nowIso(),
  });
}

export async function setDeliveredTick(
  myUserId: string,
  conversationId: string,
  clientMessageId: string,
  deliveredAt?: string
) {
  await upsertTick(myUserId, conversationId, clientMessageId, {
    state: "delivered",
    deliveredAt: deliveredAt || nowIso(),
  });
}

export async function setSeenTick(
  myUserId: string,
  conversationId: string,
  clientMessageId: string,
  seenAt?: string
) {
  await upsertTick(myUserId, conversationId, clientMessageId, {
    state: "seen",
    seenAt: seenAt || nowIso(),
  });
}

export async function setSeenTickBulk(
  myUserId: string,
  conversationId: string,
  clientMessageIds: string[],
  seenAt?: string
) {
  if (!clientMessageIds?.length) return;
  const at = seenAt || nowIso();

  const map = await loadMap(myUserId, conversationId);
  for (const id of clientMessageIds) {
    if (!id) continue;
    const prev = map[id];
    const state = mergeState(prev, "seen");
    map[id] = {
      clientMessageId: id,
      state,
      serverAcceptedAt: prev?.serverAcceptedAt || at,
      deliveredAt: prev?.deliveredAt || at,
      seenAt: at,
      updatedAt: nowIso(),
    };
  }

  await saveMap(myUserId, conversationId, compactIfNeeded(map));
}

export async function getTickMap(myUserId: string, conversationId: string): Promise<TickMap> {
  return loadMap(myUserId, conversationId);
}

export async function getTickState(
  myUserId: string,
  conversationId: string,
  clientMessageId: string
): Promise<TickState> {
  const map = await loadMap(myUserId, conversationId);
  return map[clientMessageId]?.state || "pending";
}

export async function clearConversationTicks(myUserId: string, conversationId: string) {
  await AsyncStorage.removeItem(keyOf(myUserId, conversationId));
}