import {
    KeyHelper,
  } from "libsignal-protocol-typescript";
  import { SignalStore } from "./signalStore";
  import { registerDeviceBundle } from "../services/api_e2ee";
  import { Buffer } from "buffer";
  
  export async function ensureDeviceKeys(deviceId: string) {
    const store = new SignalStore();
    let idPair = await store.getIdentityKeyPair();
    let regId = await store.getLocalRegistrationId();
  
    if (!idPair) {
      idPair = await KeyHelper.generateIdentityKeyPair();
      await store.storeIdentityKeyPair({
        pubKey: Buffer.from(idPair.pubKey).toString("base64"),
        privKey: Buffer.from(idPair.privKey).toString("base64"),
      });
    } else {
      idPair = {
        pubKey: Buffer.from(idPair.pubKey, "base64"),
        privKey: Buffer.from(idPair.privKey, "base64"),
      };
    }
  
    if (!regId) {
      regId = await KeyHelper.generateRegistrationId();
      await store.storeLocalRegistrationId(regId);
    }
  
    const spkId = 1;
    const spk = await KeyHelper.generateSignedPreKey(idPair, spkId);
    await store.storeSignedPreKey(spkId, {
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
  
    await registerDeviceBundle({
      deviceId,
      identityPub: Buffer.from(idPair.pubKey).toString("base64"),
      signedPrekeyPub: Buffer.from(spk.keyPair.pubKey).toString("base64"),
      signedPrekeySig: Buffer.from(spk.signature).toString("base64"),
      oneTimePrekeys: otps,
    });
  }