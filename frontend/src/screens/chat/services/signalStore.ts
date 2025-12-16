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

// ---------- Signal Store (USER-SCOPED) ----------
export class SignalStore {
  constructor(private userId: string) {}

  // ----- Keychain service names -----
  private IDENTITY = () => `E2EE_IDENTITY_${this.userId}`;
  private REG = () => `E2EE_REG_${this.userId}`;
  private PK = (id: number) => `E2EE_PK_${this.userId}_${id}`;
  private SPK = (id: number) => `E2EE_SPK_${this.userId}_${id}`;

  // ---------- Identity ----------
  async getIdentityKeyPair(): Promise<{ pubKey: string; privKey: string } | undefined> {
    const creds = await Keychain.getGenericPassword({ service: this.IDENTITY() });
    return creds?.password ? JSON.parse(creds.password) : undefined;
  }

  async storeIdentityKeyPair(pair: { pubKey: string; privKey: string }) {
    await Keychain.setGenericPassword("id", JSON.stringify(pair), {
      service: this.IDENTITY(),
    });
  }

  // ---------- Registration ID ----------
  async getLocalRegistrationId(): Promise<number | undefined> {
    const creds = await Keychain.getGenericPassword({ service: this.REG() });
    return creds?.password ? JSON.parse(creds.password) : undefined;
  }

  async storeLocalRegistrationId(id: number) {
    await Keychain.setGenericPassword("reg", JSON.stringify(id), {
      service: this.REG(),
    });
  }

  // ---------- Sessions ----------
  async loadSession(addr: SignalProtocolAddress) {
    const v = await AsyncStorage.getItem(
      `E2EE_SESSION_${this.userId}_${addr.toString()}`
    );
    return v ? b64ToArrayBuffer(v) : undefined;
  }

  async storeSession(addr: SignalProtocolAddress, record: ArrayBuffer) {
    await AsyncStorage.setItem(
      `E2EE_SESSION_${this.userId}_${addr.toString()}`,
      toB64(record)
    );
  }

  async removeSession(addr: SignalProtocolAddress) {
    await AsyncStorage.removeItem(
      `E2EE_SESSION_${this.userId}_${addr.toString()}`
    );
  }

  // ---------- PreKeys ----------
  async loadPreKey(id: number) {
    const creds = await Keychain.getGenericPassword({ service: this.PK(id) });
    if (!creds?.password) return undefined;

    const p = JSON.parse(creds.password);
    return {
      keyId: p.keyId,
      keyPair: {
        pubKey: b64ToArrayBuffer(p.publicKey),
        privKey: b64ToArrayBuffer(p.privateKey),
      },
    };
  }

  async storePreKey(id: number, key: any) {
    await Keychain.setGenericPassword("pk", JSON.stringify(key), {
      service: this.PK(id),
    });
  }

  async removePreKey(id: number) {
    await Keychain.resetGenericPassword({ service: this.PK(id) });
  }

  // ---------- Signed PreKeys ----------
  async loadSignedPreKey(id: number) {
    const creds = await Keychain.getGenericPassword({ service: this.SPK(id) });
    if (!creds?.password) return undefined;

    const p = JSON.parse(creds.password);
    return {
      keyId: p.keyId,
      keyPair: {
        pubKey: b64ToArrayBuffer(p.publicKey),
        privKey: b64ToArrayBuffer(p.privateKey),
      },
      signature: b64ToArrayBuffer(p.signature),
    };
  }

  async storeSignedPreKey(id: number, key: any) {
    await Keychain.setGenericPassword("spk", JSON.stringify(key), {
      service: this.SPK(id),
    });
  }

  async removeSignedPreKey(id: number) {
    await Keychain.resetGenericPassword({ service: this.SPK(id) });
  }

  // ---------- Identity trust ----------
  async isTrustedIdentity() {
    return true; // trust-all for now
  }

  async loadIdentity(addr: SignalProtocolAddress) {
    const v = await AsyncStorage.getItem(
      `E2EE_IDENT_${this.userId}_${addr.toString()}`
    );
    return v ? b64ToArrayBuffer(v) : undefined;
  }

  async saveIdentity(addr: SignalProtocolAddress, identityKey: ArrayBuffer | Uint8Array) {
    await AsyncStorage.setItem(
      `E2EE_IDENT_${this.userId}_${addr.toString()}`,
      toB64(identityKey)
    );
    return true;
  }
}
