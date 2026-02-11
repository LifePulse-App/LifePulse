import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import { SignalProtocolAddress } from "@privacyresearch/libsignal-protocol-typescript";
import { Buffer } from "buffer";

// ---------- Base64 helpers ----------
export function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const u8 = Buffer.from(b64, "base64");
  const copy = new Uint8Array(u8.length);
  copy.set(u8);
  return copy.buffer;
}

export function toB64(buf: ArrayBuffer | Uint8Array) {
  return Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString("base64");
}

type KeyPairType = { pubKey: ArrayBuffer; privKey: ArrayBuffer };

export class SignalStore {
  constructor(private userId: string, private localDeviceId: string) {}

  // ----- Keychain service names (device scoped) -----
  private IDENTITY = () => `E2EE_IDENTITY_${this.userId}_${this.localDeviceId}`;
  private REG = () => `E2EE_REG_${this.userId}_${this.localDeviceId}`;
  private PK = (id: number) => `E2EE_PK_${this.userId}_${this.localDeviceId}_${id}`;
  private SPK = (id: number) => `E2EE_SPK_${this.userId}_${this.localDeviceId}_${id}`;
  private SPK_SIG = (id: number) => `E2EE_SPKSIG_${this.userId}_${this.localDeviceId}_${id}`; // for upload only

  // ----- AsyncStorage prefixes (device scoped) -----
  private SESSION_KEY = (addr: SignalProtocolAddress) =>
    `E2EE_SESSION_${this.userId}_${this.localDeviceId}_${addr.toString()}`;
  private IDENT_KEY = (addr: SignalProtocolAddress) =>
    `E2EE_IDENT_${this.userId}_${this.localDeviceId}_${addr.toString()}`;

  // ---------- Identity ----------
  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const creds = await Keychain.getGenericPassword({ service: this.IDENTITY() });
    if (!creds?.password) return undefined;

    const p = JSON.parse(creds.password) as { pubKey: string; privKey: string };
    return { pubKey: b64ToArrayBuffer(p.pubKey), privKey: b64ToArrayBuffer(p.privKey) };
  }

  async getIdentityKeyPairB64(): Promise<{ pubKey: string; privKey: string } | undefined> {
    const creds = await Keychain.getGenericPassword({ service: this.IDENTITY() });
    if (!creds?.password) return undefined;
    return JSON.parse(creds.password) as { pubKey: string; privKey: string };
  }

  async storeIdentityKeyPair(pair: { pubKey: string; privKey: string }) {
    await Keychain.setGenericPassword("id", JSON.stringify(pair), { service: this.IDENTITY() });
  }

  // ---------- Registration ID ----------
  async getLocalRegistrationId(): Promise<number | undefined> {
    const creds = await Keychain.getGenericPassword({ service: this.REG() });
    return creds?.password ? JSON.parse(creds.password) : undefined;
  }

  async storeLocalRegistrationId(id: number) {
    await Keychain.setGenericPassword("reg", JSON.stringify(id), { service: this.REG() });
  }

  // ---------- Sessions (STRING ONLY) ----------
  async loadSession(addr: SignalProtocolAddress): Promise<string | undefined> {
    const v = await AsyncStorage.getItem(this.SESSION_KEY(addr));
    return v ?? undefined;
  }

  async storeSession(addr: SignalProtocolAddress, record: unknown) {
    const key = this.SESSION_KEY(addr);

    if (typeof record === "string") {
      await AsyncStorage.setItem(key, record);
      return;
    }

    // support serialize() if any
    if (record && typeof record === "object" && typeof (record as any).serialize === "function") {
      const s = (record as any).serialize();
      if (typeof s === "string") {
        await AsyncStorage.setItem(key, s);
        return;
      }
    }

    throw new Error(`Unsupported session record type: ${typeof record}`);
  }

  async removeSession(addr: SignalProtocolAddress) {
    await AsyncStorage.removeItem(this.SESSION_KEY(addr));
  }

  async clearAllSessions() {
    const prefix = `E2EE_SESSION_${this.userId}_${this.localDeviceId}_`;
    const keys = await AsyncStorage.getAllKeys();
    const sessionKeys = keys.filter((k) => k.startsWith(prefix));
    if (sessionKeys.length) await AsyncStorage.multiRemove(sessionKeys);
  }

  // aliases for lib compat
  async getSession(addr: SignalProtocolAddress) {
    return this.loadSession(addr);
  }
  async putSession(addr: SignalProtocolAddress, record: unknown) {
    return this.storeSession(addr, record);
  }
  async loadSessionRecord(addr: SignalProtocolAddress) {
    return this.loadSession(addr);
  }
  async storeSessionRecord(addr: SignalProtocolAddress, record: unknown) {
    return this.storeSession(addr, record);
  }
  async removeSessionRecord(addr: SignalProtocolAddress) {
    return this.removeSession(addr);
  }

  // ---------- PreKeys (KeyPairType ONLY) ----------
  async loadPreKey(id: number): Promise<KeyPairType | undefined> {
    const creds = await Keychain.getGenericPassword({ service: this.PK(id) });
    if (!creds?.password) return undefined;

    const p = JSON.parse(creds.password) as { publicKey: string; privateKey: string };
    return { pubKey: b64ToArrayBuffer(p.publicKey), privKey: b64ToArrayBuffer(p.privateKey) };
  }

  async storePreKey(id: number, keyPair: KeyPairType) {
    await Keychain.setGenericPassword(
      "pk",
      JSON.stringify({ publicKey: toB64(keyPair.pubKey), privateKey: toB64(keyPair.privKey) }),
      { service: this.PK(id) }
    );
  }

  async removePreKey(id: number) {
    await Keychain.resetGenericPassword({ service: this.PK(id) });
  }

  // aliases
  async loadPreKeyRecord(id: number) {
    return this.loadPreKey(id);
  }
  async storePreKeyRecord(id: number, key: any) {
    return this.storePreKey(id, key);
  }
  async removePreKeyRecord(id: number) {
    return this.removePreKey(id);
  }

  // ---------- Signed PreKeys (KeyPairType ONLY) ----------
  async loadSignedPreKey(id: number): Promise<KeyPairType | undefined> {
    const creds = await Keychain.getGenericPassword({ service: this.SPK(id) });
    if (!creds?.password) return undefined;

    const p = JSON.parse(creds.password) as { publicKey: string; privateKey: string };
    return { pubKey: b64ToArrayBuffer(p.publicKey), privKey: b64ToArrayBuffer(p.privateKey) };
  }

  async storeSignedPreKey(id: number, keyPair: KeyPairType) {
    await Keychain.setGenericPassword(
      "spk",
      JSON.stringify({ publicKey: toB64(keyPair.pubKey), privateKey: toB64(keyPair.privKey) }),
      { service: this.SPK(id) }
    );
  }

  async removeSignedPreKey(id: number) {
    await Keychain.resetGenericPassword({ service: this.SPK(id) });
    await Keychain.resetGenericPassword({ service: this.SPK_SIG(id) });
  }

  // signature storage (for upload only)
  async getSignedPreKeySignatureB64(id: number): Promise<string | undefined> {
    const creds = await Keychain.getGenericPassword({ service: this.SPK_SIG(id) });
    return creds?.password ? (JSON.parse(creds.password) as string) : undefined;
  }

  async storeSignedPreKeySignatureB64(id: number, sigB64: string) {
    await Keychain.setGenericPassword("spksig", JSON.stringify(sigB64), { service: this.SPK_SIG(id) });
  }

  // aliases
  async loadSignedPreKeyRecord(id: number) {
    return this.loadSignedPreKey(id);
  }
  async storeSignedPreKeyRecord(id: number, key: any) {
    return this.storeSignedPreKey(id, key);
  }
  async removeSignedPreKeyRecord(id: number) {
    return this.removeSignedPreKey(id);
  }

  // ---------- Identity trust ----------
  async isTrustedIdentity(addr: SignalProtocolAddress, identityKey: ArrayBuffer, direction?: number) {
    return true;
  }
  async isTrustedIdentityKey(addr: SignalProtocolAddress, identityKey: ArrayBuffer, direction?: number) {
    return true;
  }

  // ---------- Remote identity ----------
  async loadIdentity(addr: SignalProtocolAddress) {
    const v = await AsyncStorage.getItem(this.IDENT_KEY(addr));
    return v ? b64ToArrayBuffer(v) : undefined;
  }
  async loadIdentityKey(addr: SignalProtocolAddress) {
    return this.loadIdentity(addr);
  }
  async saveIdentity(addr: SignalProtocolAddress, identityKey: ArrayBuffer | Uint8Array) {
    await AsyncStorage.setItem(this.IDENT_KEY(addr), toB64(identityKey));
    return true;
  }
  // inside SignalStore class
private SIGNAL_DEVICE_ID = () => `E2EE_SIGNAL_DEVICE_ID_${this.userId}_${this.localDeviceId}`;

async getSignalDeviceId(): Promise<number | undefined> {
  const creds = await Keychain.getGenericPassword({ service: this.SIGNAL_DEVICE_ID() });
  return creds?.password ? JSON.parse(creds.password) : undefined;
}

async storeSignalDeviceId(id: number) {
  await Keychain.setGenericPassword("sigDevId", JSON.stringify(id), { service: this.SIGNAL_DEVICE_ID() });
}
}