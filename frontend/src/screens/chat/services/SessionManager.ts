import {
  SignalProtocolAddress,
  SessionBuilder,
  SessionCipher,
} from "@privacyresearch/libsignal-protocol-typescript";
import { SignalStore, b64ToArrayBuffer } from "./signalStore";
import { Buffer } from "buffer";

export class SessionManager {
  private store: SignalStore;

  constructor(private userId: string) {
    this.store = new SignalStore(userId);
  }

  async ensureSession(peerUserId: string, bundle: any) {
    const peerDeviceId = Number(bundle.deviceId) || 1;
    const addr = new SignalProtocolAddress(peerUserId, peerDeviceId);
    const builder = new SessionBuilder(this.store as any, addr);

    await builder.processPreKey({
      registrationId: bundle.registrationId,
      identityKey: b64ToArrayBuffer(bundle.identityKey),
      signedPreKey: {
        keyId: bundle.signedPreKey.keyId,
        publicKey: b64ToArrayBuffer(bundle.signedPreKey.publicKey),
        signature: b64ToArrayBuffer(bundle.signedPreKey.signature),
      },
      preKey: {
        keyId: bundle.preKey.keyId,
        publicKey: b64ToArrayBuffer(bundle.preKey.publicKey),
      },
    } as any);
  }

  async encrypt(peerUserId: string, peerDeviceId: number, plaintext: string) {
    const addr = new SignalProtocolAddress(peerUserId, peerDeviceId);
    const cipher = new SessionCipher(this.store as any, addr);
    const msg = await cipher.encrypt(new TextEncoder().encode(plaintext));

    return {
      type: msg.type === 3 ? "prekey" : "message",
      body: Buffer.from(msg.serialize()).toString("base64"),
    };
  }

  async decrypt(fromUserId: string, fromDeviceId: number, payload: any) {
    const addr = new SignalProtocolAddress(fromUserId, fromDeviceId);
    const cipher = new SessionCipher(this.store as any, addr);
    const bytes = Buffer.from(payload.body, "base64");

    const plaintext =
      payload.type === "prekey"
        ? await cipher.decryptPreKeyWhisperMessage(bytes, "binary")
        : await cipher.decryptWhisperMessage(bytes, "binary");

    return new TextDecoder().decode(plaintext);
  }
}
