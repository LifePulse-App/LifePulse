import { KeyHelper } from "libsignal-protocol-typescript";
import { SignalStore } from "./signalStore";
import { registerDeviceBundle } from "../services/api_e2ee";
import { Buffer } from "buffer";

// derive a stable numeric registrationId from deviceId (fallback to 1)
export const toDeviceRegistrationId = (deviceId: string): number => {
  const hex = (deviceId || "").replace(/[^a-fA-F0-9]/g, "");
  const n = parseInt(hex.slice(-6) || "0", 16);
  return n > 0 ? n : 1;
};

export async function ensureDeviceKeys(deviceId: string) {
  const store = new SignalStore();

  let storedIdPair = await store.getIdentityKeyPair();
  let regId = await store.getLocalRegistrationId();

  // raw buffers for libsignal, b64 strings for storage
  let idPairRaw: { pubKey: ArrayBuffer; privKey: ArrayBuffer };
  let idPairB64: { pubKey: string; privKey: string };

  if (!storedIdPair) {
    const generated = await KeyHelper.generateIdentityKeyPair(); // returns ArrayBuffer keys
    idPairRaw = generated;
    idPairB64 = {
      pubKey: Buffer.from(generated.pubKey).toString("base64"),
      privKey: Buffer.from(generated.privKey).toString("base64"),
    };
    await store.storeIdentityKeyPair(idPairB64);
  } else {
    const pub = Buffer.from(storedIdPair.pubKey, "base64");
    const priv = Buffer.from(storedIdPair.privKey, "base64");
    idPairRaw = {
      pubKey: pub.buffer.slice(pub.byteOffset, pub.byteOffset + pub.byteLength),
      privKey: priv.buffer.slice(priv.byteOffset, priv.byteOffset + priv.byteLength),
    };
    idPairB64 = storedIdPair;
  }

  if (!regId) {
    regId = toDeviceRegistrationId(deviceId);
    await store.storeLocalRegistrationId(regId);
  }

  const signedPrekeyId = 1;
  const spk = await KeyHelper.generateSignedPreKey(
    { pubKey: idPairRaw.pubKey, privKey: idPairRaw.privKey } as any,
    signedPrekeyId
  );

  await store.storeSignedPreKey(signedPrekeyId, {
    keyId: spk.keyId,
    publicKey: Buffer.from(spk.keyPair.pubKey).toString("base64"),
    privateKey: Buffer.from(spk.keyPair.privKey).toString("base64"),
    signature: Buffer.from(spk.signature).toString("base64"),
  });

  const otps = [];
  for (let i = 2; i < 17; i++) {
    const pk = await KeyHelper.generatePreKey(i);
    otps.push({ keyId: String(i), pubKey: Buffer.from(pk.keyPair.pubKey).toString("base64") });
    await store.storePreKey(i, {
      keyId: pk.keyId,
      publicKey: Buffer.from(pk.keyPair.pubKey).toString("base64"),
      privateKey: Buffer.from(pk.keyPair.privKey).toString("base64"),
    });
  }

  const data = await registerDeviceBundle({
    deviceId,
    registrationId: regId,
    identityPub: idPairB64.pubKey,
    signedPrekeyPub: Buffer.from(spk.keyPair.pubKey).toString("base64"),
    signedPrekeySig: Buffer.from(spk.signature).toString("base64"),
    signedPrekeyId,
    oneTimePrekeys: otps,
  });
  console.log("[ensureDeviceKeys] registerDeviceBundle result", data?.data || data);
}