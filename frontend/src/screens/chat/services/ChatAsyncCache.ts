import AsyncStorage from "@react-native-async-storage/async-storage";

/*
  KEY STRUCTURE

  chat:conversations:{userId}
  chat:messages:{userId}:{conversationId}
  chat:unsent:{userId}
*/

/* ============================================================
   CONVERSATIONS (CHAT LIST)
============================================================ */

export const saveConversations = async (
  userId: string,
  conversations: any[]
) => {
  try {
    const key = `chat:conversations:${userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(conversations));
  } catch (error) {
    console.log("saveConversations error:", error);
  }
};

export const loadConversations = async (userId: string) => {
  try {
    const key = `chat:conversations:${userId}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.log("loadConversations error:", error);
    return [];
  }
};

/* ============================================================
   MESSAGES (THREAD CACHE)
============================================================ */

export const saveMessages = async (
  userId: string,
  conversationId: string,
  messages: any[]
) => {
  try {
    const key = `chat:messages:${userId}:${conversationId}`;

    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    );

    await AsyncStorage.setItem(key, JSON.stringify(sorted));
  } catch (error) {
    console.log("saveMessages error:", error);
  }
};

export const loadMessages = async (
  userId: string,
  conversationId: string
) => {
  try {
    const key = `chat:messages:${userId}:${conversationId}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.log("loadMessages error:", error);
    return [];
  }
};

/* ============================================================
   UPSERT SINGLE MESSAGE (OPTIMISTIC UPDATE SAFE)
============================================================ */

export const upsertMessage = async (
  userId: string,
  conversationId: string,
  message: any
) => {
  try {
    const key = `chat:messages:${userId}:${conversationId}`;
    const existing = await AsyncStorage.getItem(key);

    let messages = existing ? JSON.parse(existing) : [];

    const index = messages.findIndex(
      (m: any) =>
        m._id === message._id ||
        (m.clientMessageId &&
          message.clientMessageId &&
          m.clientMessageId === message.clientMessageId)
    );

    if (index >= 0) {
      messages[index] = message;
    } else {
      messages.push(message);
    }

    messages.sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    );

    await AsyncStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.log("upsertMessage error:", error);
  }
};

/* ============================================================
   UNSENT OFFLINE MESSAGE QUEUE (OPTIONAL BUT STRONG)
============================================================ */

export const addUnsentMessage = async (userId: string, message: any) => {
  try {
    const key = `chat:unsent:${userId}`;
    const existing = await AsyncStorage.getItem(key);
    const queue = existing ? JSON.parse(existing) : [];

    queue.push(message);

    await AsyncStorage.setItem(key, JSON.stringify(queue));
  } catch (error) {
    console.log("addUnsentMessage error:", error);
  }
};

export const getUnsentMessages = async (userId: string) => {
  try {
    const key = `chat:unsent:${userId}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.log("getUnsentMessages error:", error);
    return [];
  }
};

export const clearUnsentMessages = async (userId: string) => {
  try {
    const key = `chat:unsent:${userId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.log("clearUnsentMessages error:", error);
  }
};

/* ============================================================
   CLEAR ALL CHAT CACHE (DEBUG PURPOSE)
============================================================ */

export const clearAllChatCache = async (userId: string) => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    const chatKeys = keys.filter((k) =>
      k.startsWith(`chat:`)
    );

    await AsyncStorage.multiRemove(chatKeys);
  } catch (error) {
    console.log("clearAllChatCache error:", error);
  }
};