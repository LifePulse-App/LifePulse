import { KeyHelper } from "@privacyresearch/libsignal-protocol-typescript";
import { SignalStore, toB64, b64ToArrayBuffer } from "./signalStore";
import { registerDeviceBundle } from "../services/api_e2ee";

export async function ensureDeviceKeys(userId: string, deviceId: string) {
  const store = new SignalStore(userId);

  let identity = await store.getIdentityKeyPair();
  let regId = await store.getLocalRegistrationId();
  let identityRaw;

  // ---------- Identity ----------
  if (!identity) {
    const g = await KeyHelper.generateIdentityKeyPair();
    identity = {
      pubKey: toB64(g.pubKey),
      privKey: toB64(g.privKey),
    };
    identityRaw = g;
    await store.storeIdentityKeyPair(identity);
  } else {
    identityRaw = {
      pubKey: b64ToArrayBuffer(identity.pubKey),
      privKey: b64ToArrayBuffer(identity.privKey),
    };
  }

  // ---------- Registration ID ----------
  if (!regId) {
    regId = KeyHelper.generateRegistrationId();
    await store.storeLocalRegistrationId(regId);
  }

  // ---------- Signed PreKey ----------
  const signedPrekeyId = 1;
  const spk = await KeyHelper.generateSignedPreKey(identityRaw, signedPrekeyId);

  await store.storeSignedPreKey(signedPrekeyId, {
    keyId: spk.keyId,
    publicKey: toB64(spk.keyPair.pubKey),
    privateKey: toB64(spk.keyPair.privKey),
    signature: toB64(spk.signature),
  });

  // ---------- One-time PreKeys ----------
  const oneTimePrekeys = [];
  for (let i = 2; i < 17; i++) {
    const pk = await KeyHelper.generatePreKey(i);
    oneTimePrekeys.push({
      keyId: i,
      publicKey: toB64(pk.keyPair.pubKey),
    });
    await store.storePreKey(i, {
      keyId: i,
      publicKey: toB64(pk.keyPair.pubKey),
      privateKey: toB64(pk.keyPair.privKey),
    });
  }

  // ---------- Upload bundle ----------
  await registerDeviceBundle({
    userId,
    deviceId,
    registrationId: regId,
    identityPub: identity.pubKey,
    signedPrekeyId,
    signedPrekeyPub: toB64(spk.keyPair.pubKey),
    signedPrekeySig: toB64(spk.signature),
    oneTimePrekeys,
  });
}
