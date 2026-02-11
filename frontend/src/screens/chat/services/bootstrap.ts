// services/bootstrap.ts
import { KeyHelper } from "@privacyresearch/libsignal-protocol-typescript";
import { SignalStore, toB64, b64ToArrayBuffer } from "./signalStore";
import { registerDeviceBundle } from "../services/api_e2ee";

  export async function ensureDeviceKeys(userId: string, deviceId: string) {
    const store = new SignalStore(userId, deviceId);

  // ---------- Identity (create once) ----------
  let identityB64 = await store.getIdentityKeyPairB64();
  let identityRaw: { pubKey: ArrayBuffer; privKey: ArrayBuffer };

  if (!identityB64) {
    const g = await KeyHelper.generateIdentityKeyPair();
    identityB64 = { pubKey: toB64(g.pubKey), privKey: toB64(g.privKey) };
    await store.storeIdentityKeyPair(identityB64);
    identityRaw = g;
  } else {
    identityRaw = {
      pubKey: b64ToArrayBuffer(identityB64.pubKey),
      privKey: b64ToArrayBuffer(identityB64.privKey),
    };
  }

  // ---------- RegistrationId (create once) ----------
  let regId = await store.getLocalRegistrationId();
  if (!regId) {
    regId = KeyHelper.generateRegistrationId();
    await store.storeLocalRegistrationId(regId);
  }

  // ---------- Signed prekey (create once) ----------
  const signedPrekeyId = 1;

  let spkPair = await store.loadSignedPreKey(signedPrekeyId);
  let spkSigB64 = await store.getSignedPreKeySignatureB64(signedPrekeyId);

  if (!spkPair || !spkSigB64) {
    const generated = await KeyHelper.generateSignedPreKey(identityRaw, signedPrekeyId);
    await store.storeSignedPreKey(signedPrekeyId, generated.keyPair);
    await store.storeSignedPreKeySignatureB64(signedPrekeyId, toB64(generated.signature));

    spkPair = generated.keyPair;
    spkSigB64 = toB64(generated.signature);
  }

  if (!spkPair || !spkSigB64) throw new Error("Signed prekey missing after generation");

  // ---------- One-time prekeys (create missing only) ----------
  const oneTimePrekeys: Array<{ keyId: number; publicKey: string }> = [];
  for (let i = 2; i < 17; i++) {
    const existing = await store.loadPreKey(i);
    if (!existing) {
      const pk = await KeyHelper.generatePreKey(i);
      await store.storePreKey(i, pk.keyPair);
    }
    const pkNow = await store.loadPreKey(i);
    if (pkNow) oneTimePrekeys.push({ keyId: i, publicKey: toB64(pkNow.pubKey) });
  }

  let signalDeviceId = await store.getSignalDeviceId();
  if (!signalDeviceId) {
    signalDeviceId = Math.floor(Math.random() * 16000) + 1; // 1..16000
    await store.storeSignalDeviceId(signalDeviceId);
  }

  // ---------- Upload bundle ----------
  await registerDeviceBundle({
    deviceId,
    signalDeviceId, // ✅
    registrationId: regId,
    identityPub: identityB64.pubKey,
    signedPrekeyId,
    signedPrekeyPub: toB64(spkPair.pubKey),
    signedPrekeySig: spkSigB64,
    oneTimePrekeys,
  });
}