// services/SessionManager.ts
import { SignalProtocolAddress, SessionBuilder, SessionCipher } from "@privacyresearch/libsignal-protocol-typescript";
import { SignalStore, b64ToArrayBuffer } from "./signalStore";
import { Buffer } from "buffer";

const nameOf = (userId: string) => `user:${userId}`;

export class SessionManager {
  private store: SignalStore;

  constructor(private myUserId: string, private myDeviceId: string) {
    this.store = new SignalStore(myUserId, myDeviceId);
  }

  async ensureSession(peerUserId: string, bundle: any) {
    const peerDeviceId = bundle.deviceId; // numeric
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

  async encrypt(peerUserId: string, bundle: any, plaintext: string) {
    const peerDeviceId = bundle.deviceId;
    const addr = new SignalProtocolAddress(peerUserId, peerDeviceId);
    const cipher = new SessionCipher(this.store as any, addr);

    const u8 = new TextEncoder().encode(plaintext);
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);

    const msg: any = await cipher.encrypt(ab);

    const bodyBytes =
      msg.body instanceof ArrayBuffer
        ? new Uint8Array(msg.body)
        : msg.body instanceof Uint8Array
          ? msg.body
          : typeof msg.body === "string"
            ? Buffer.from(msg.body, "binary")
            : (() => {
                throw new Error(`Unsupported encrypted message body type: ${typeof msg.body}`);
              })();

    return { type: msg.type === 3 ? "prekey" : "message", body: Buffer.from(bodyBytes).toString("base64") };
  }

  async decrypt(fromUserId: string, fromDeviceId: number, payload: any) {
    const addr = new SignalProtocolAddress(fromUserId, fromDeviceId);
    const cipher = new SessionCipher(this.store as any, addr);

    const buf = Buffer.from(payload.body, "base64");
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

    const plaintext =
      payload.type === "prekey"
        ? await cipher.decryptPreKeyWhisperMessage(ab)
        : await cipher.decryptWhisperMessage(ab);
        

    return new TextDecoder().decode(plaintext);
  }
}