import {
  SignalProtocolAddress,
  SessionBuilder,
  SessionCipher,
} from "libsignal-protocol-typescript";
import { SignalStore } from "../services/signalStore";
import { Buffer } from "buffer";

const b64 = (u: ArrayBuffer | Uint8Array) => Buffer.from(u as any).toString("base64");
const fromB64 = (b: string) => Buffer.from(b, "base64");

const toBundle = (bundle: any) => ({
  registrationId: 0,
  identityKey: fromB64(bundle.identityPub),
  signedPreKey: {
    keyId: 1,
    publicKey: fromB64(bundle.signedPrekeyPub),
    signature: fromB64(bundle.signedPrekeySig),
  },
  preKey: bundle.oneTimePrekeys?.length
    ? { keyId: Number(bundle.oneTimePrekeys[0].keyId), publicKey: fromB64(bundle.oneTimePrekeys[0].pubKey) }
    : undefined,
});

export class SessionManager {
  store: SignalStore;
  myAddress: SignalProtocolAddress;

  constructor(myUserId: string, myDeviceId: string) {
    this.store = new SignalStore();
    this.myAddress = new SignalProtocolAddress(myUserId, Number(myDeviceId));
  }

  async ensureSession(peerUserId: string, peerDeviceId: string, bundle: any) {
    const addr = new SignalProtocolAddress(peerUserId, Number(peerDeviceId));
    const builder = new SessionBuilder(this.store as any, addr);
    await builder.processPreKey(toBundle(bundle) as any);
  }

  async encrypt(peerUserId: string, peerDeviceId: string, plaintext: string) {
    const addr = new SignalProtocolAddress(peerUserId, Number(peerDeviceId));
    const cipher = new SessionCipher(this.store as any, addr);
    const msg = await cipher.encrypt(new TextEncoder().encode(plaintext));
    if ("serialize" in msg) return { type: "prekey", body: b64(msg.serialize()) };
    return { type: "message", body: b64(msg.serialize()) };
  }

  async decrypt(fromUserId: string, fromDeviceId: string, payload: any) {
    const addr = new SignalProtocolAddress(fromUserId, Number(fromDeviceId));
    const cipher = new SessionCipher(this.store as any, addr);
    const bytes = fromB64(payload.body);
    let plaintext: ArrayBuffer;
    if (payload.type === "prekey") plaintext = await cipher.decryptPreKeyWhisperMessage(bytes, "binary");
    else plaintext = await cipher.decryptWhisperMessage(bytes, "binary");
    return new TextDecoder().decode(plaintext);
  }
}