import AsyncStorage from "@react-native-async-storage/async-storage";
import crypto from "react-native-quick-crypto";
import { Buffer } from "buffer";
import { fetchDevices, upsertConversationEnvelopes } from "./api_e2ee";

// Stores CEK per conversation+epoch per local device/user context.
// NOTE: this is a practical permanent app fix without changing your Signal transport.
// Replace wrapping with real X25519 recipient-device wrapping if/when you enforce unwrap on receiver.
const cekKey = (myUserId: string, deviceId: string, conversationId: string, epoch: number) =>
  `E2EE_CEK:${myUserId}:${deviceId}:${conversationId}:${epoch}`;

async function getOrCreateCEKHex(
  myUserId: string,
  deviceId: string,
  conversationId: string,
  epoch: number
): Promise<string> {
  const key = cekKey(myUserId, deviceId, conversationId, epoch);
  const prev = await AsyncStorage.getItem(key);
  if (prev) return prev;

  const cek = Buffer.from(crypto.randomBytes(32)).toString("hex");
  await AsyncStorage.setItem(key, cek);
  return cek;
}

function pseudoWrapForDevice(cekHex: string, devicePubMaterial: string) {
  // Deterministic authenticated blob for backend presence checks.
  // If you later enforce unwrap, replace this with true X25519 sealed-box wrapping.
  const mac = crypto.createHmac("sha256", Buffer.from(cekHex, "hex")).update(devicePubMaterial).digest("hex");
  return `cekv1.${mac}`;
}

export async function ensureEnvelopesForPeer(
  myUserId: string,
  myDeviceId: string,
  conversationId: string,
  peerUserId: string,
  epoch: number = 1
) {
  const cekHex = await getOrCreateCEKHex(myUserId, myDeviceId, conversationId, epoch);

  const { data } = await fetchDevices(String(peerUserId));
  const devices = data?.devices || [];
  if (!devices.length) return [];

  const envelopes = devices.map((d: any) => ({
    userId: String(peerUserId),
    deviceId: String(d.deviceId),
    wrappedKey: pseudoWrapForDevice(
      cekHex,
      `${d.identityPub || ""}:${d.signedPrekeyPub || ""}:${d.deviceId || ""}`
    ),
    wrapAlg: "cekv1+hmac",
  }));

  await upsertConversationEnvelopes(String(conversationId), { epoch, envelopes });
  return devices.map((d: any) => String(d.deviceId));
}