import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalMessageStore } from "./LocalMessageStore";

export type LocalConversationPreview = {
  peerUserId: string;
  lastText: string;
  lastAt: string;
};

export async function listConversationPreviews(myUserId: string, deviceId: string) {
  const prefix = `E2EE_THREAD_V1:${myUserId}:${deviceId}:`;
  const keys = await AsyncStorage.getAllKeys();
  const threadKeys = keys.filter((k) => k.startsWith(prefix));

  const previews: LocalConversationPreview[] = [];

  for (const k of threadKeys) {
    const peerUserId = k.slice(prefix.length);
    try {
      const store = new LocalMessageStore(myUserId, deviceId, peerUserId);
      const all = await store.listPlaintext();
      if (!all.length) continue;

      const last = all[all.length - 1];
      previews.push({
        peerUserId,
        lastText: last.plaintext,
        lastAt: last.createdAt,
      });
    } catch {
      // ignore
    }
  }

  previews.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  return previews;
}