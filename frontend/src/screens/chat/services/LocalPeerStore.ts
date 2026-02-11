import AsyncStorage from "@react-native-async-storage/async-storage";

const key = (myUserId: string) => `E2EE_PEERS_V1:${myUserId}`;

export type PeerRecord = {
  peerUserId: string;
  name: string;
  updatedAt: string;
};

export async function upsertPeer(myUserId: string, peerUserId: string, name: string) {
  const raw = await AsyncStorage.getItem(key(myUserId));
  const map: Record<string, PeerRecord> = raw ? JSON.parse(raw) : {};

  map[String(peerUserId)] = {
    peerUserId: String(peerUserId),
    name: String(name || "Friend"),
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(key(myUserId), JSON.stringify(map));
}

export async function getPeerName(myUserId: string, peerUserId: string) {
  const raw = await AsyncStorage.getItem(key(myUserId));
  if (!raw) return null;
  const map: Record<string, PeerRecord> = JSON.parse(raw);
  return map[String(peerUserId)]?.name ?? null;
}

export async function getPeerMap(myUserId: string) {
  const raw = await AsyncStorage.getItem(key(myUserId));
  if (!raw) return new Map<string, string>();
  const obj: Record<string, PeerRecord> = JSON.parse(raw);

  const m = new Map<string, string>();
  for (const [peerId, rec] of Object.entries(obj)) {
    m.set(peerId, rec.name);
  }
  return m;
}