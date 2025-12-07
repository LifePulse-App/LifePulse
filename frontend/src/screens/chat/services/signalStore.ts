import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import { Buffer } from "buffer";
import { SignalProtocolAddress } from "libsignal-protocol-typescript";

const SVC_ID = "E2EE_IDENTITY";
const SVC_SESS = "E2EE_SESSION";

const toB64 = (u: ArrayBuffer | Uint8Array) => Buffer.from(u as any).toString("base64");
const fromB64 = (b: string) => new Uint8Array(Buffer.from(b, "base64"));

export class SignalStore {
  async getIdentityKeyPair() {
    const creds = await Keychain.getGenericPassword({ service: SVC_ID });
    if (!creds?.password) return undefined;
    return JSON.parse(creds.password);
  }
  async storeIdentityKeyPair(pair: any) {
    await Keychain.setGenericPassword("id", JSON.stringify(pair), { service: SVC_ID });
  }
  async getLocalRegistrationId() {
    const creds = await Keychain.getGenericPassword({ service: `${SVC_ID}_REG` });
    return creds?.password ? JSON.parse(creds.password) : undefined;
  }
  async storeLocalRegistrationId(id: number) {
    await Keychain.setGenericPassword("reg", JSON.stringify(id), { service: `${SVC_ID}_REG` });
  }

  async loadSession(addr: SignalProtocolAddress) {
    const v = await AsyncStorage.getItem(`${SVC_SESS}_${addr.toString()}`);
    return v ? fromB64(v).buffer : undefined;
  }
  async storeSession(addr: SignalProtocolAddress, record: ArrayBuffer) {
    await AsyncStorage.setItem(`${SVC_SESS}_${addr.toString()}`, toB64(new Uint8Array(record)));
  }
  async removeSession(addr: SignalProtocolAddress) {
    await AsyncStorage.removeItem(`${SVC_SESS}_${addr.toString()}`);
  }

  async loadPreKey(id: number) {
    const creds = await Keychain.getGenericPassword({ service: `${SVC_ID}_PK_${id}` });
    return creds?.password ? JSON.parse(creds.password) : undefined;
  }
  async storePreKey(id: number, key: any) {
    await Keychain.setGenericPassword("pk", JSON.stringify(key), { service: `${SVC_ID}_PK_${id}` });
  }
  async removePreKey(id: number) {
    await Keychain.resetGenericPassword({ service: `${SVC_ID}_PK_${id}` });
  }

  async loadSignedPreKey(id: number) {
    const creds = await Keychain.getGenericPassword({ service: `${SVC_ID}_SPK_${id}` });
    return creds?.password ? JSON.parse(creds.password) : undefined;
  }
  async storeSignedPreKey(id: number, key: any) {
    await Keychain.setGenericPassword("spk", JSON.stringify(key), { service: `${SVC_ID}_SPK_${id}` });
  }
}