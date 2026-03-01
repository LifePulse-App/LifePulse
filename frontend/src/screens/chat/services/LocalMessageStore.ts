import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import crypto from "react-native-quick-crypto";
import { Buffer } from "buffer";

const enc = new TextEncoder();
const dec = new TextDecoder();

export type LocalMsgStatus = "sent" | "received";

export type LocalStoredMsgV1 = {
  v: 1;
  id: string;
  peerUserId: string;
  createdAt: string;
  fromUserId: string;
  fromDeviceId: string;
  toDeviceId: string;
  pt: {
    alg: "AES-256-GCM";
    ivHex: string;
    tagHex: string;
    ctHex: string;
  };
  status: LocalMsgStatus;
};

const aesService = (userId: string) => `E2EE_LOCAL_AES256_${userId}`;
// ✅ removed deviceId from thread key
const threadKey = (userId: string, peerUserId: string) =>
  `E2EE_THREAD_V1:${userId}:${peerUserId}`;

async function getOrCreateAesKeyHex(myUserId: string): Promise<string> {
  const service = aesService(myUserId);
  const creds = await Keychain.getGenericPassword({ service });
  if (creds?.password) return JSON.parse(creds.password) as string;

  const key = crypto.randomBytes(32);
  const hex = Buffer.from(key).toString("hex");
  await Keychain.setGenericPassword("aes", JSON.stringify(hex), {
    service,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  });
  return hex;
}

function encryptAesGcm(keyHex: string, plaintext: string) {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const pt = enc.encode(plaintext);
  const ct = Buffer.concat([Buffer.from(cipher.update(pt)), Buffer.from(cipher.final())]);
  const tag = cipher.getAuthTag();
  return {
    alg: "AES-256-GCM" as const,
    ivHex: Buffer.from(iv).toString("hex"),
    tagHex: Buffer.from(tag).toString("hex"),
    ctHex: ct.toString("hex"),
  };
}

function decryptAesGcm(keyHex: string, payload: { ivHex: string; tagHex: string; ctHex: string }) {
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(payload.ivHex, "hex");
  const tag = Buffer.from(payload.tagHex, "hex");
  const ct = Buffer.from(payload.ctHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([Buffer.from(decipher.update(ct)), Buffer.from(decipher.final())]);
  return dec.decode(pt);
}

export class LocalMessageStore {
  constructor(private myUserId: string, private peerUserId: string) {}

  private async loadRaw(): Promise<LocalStoredMsgV1[]> {
    const raw = await AsyncStorage.getItem(threadKey(this.myUserId, this.peerUserId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as LocalStoredMsgV1[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveRaw(msgs: LocalStoredMsgV1[]) {
    await AsyncStorage.setItem(threadKey(this.myUserId, this.peerUserId), JSON.stringify(msgs));
  }

  async listPlaintext(): Promise<(LocalStoredMsgV1 & { plaintext: string })[]> {
    const keyHex = await getOrCreateAesKeyHex(this.myUserId);
    const msgs = await this.loadRaw();
    const out = msgs.map((m) => ({ ...m, plaintext: decryptAesGcm(keyHex, m.pt) }));
    out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return out;
  }

  async upsertPlaintext(input: {
    id: string;
    createdAt: string;
    fromUserId: string;
    fromDeviceId: string;
    toDeviceId: string;
    plaintext: string;
    status: LocalMsgStatus;
  }) {
    const keyHex = await getOrCreateAesKeyHex(this.myUserId);
    const msgs = await this.loadRaw();

    const next: LocalStoredMsgV1 = {
      v: 1,
      id: input.id,
      peerUserId: this.peerUserId,
      createdAt: input.createdAt,
      fromUserId: input.fromUserId,
      fromDeviceId: input.fromDeviceId,
      toDeviceId: input.toDeviceId,
      pt: encryptAesGcm(keyHex, input.plaintext),
      status: input.status,
    };

    const idx = msgs.findIndex((x) => x.id === input.id);
    if (idx >= 0) msgs[idx] = next;
    else msgs.push(next);

    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    await this.saveRaw(msgs);
  }
}