import api from "../../../auth/api-client/api_client";
import { fetchFriends } from "./api_e2ee"; // keep existing friends endpoint reuse

export { fetchFriends };

export const openDirectConversation = (peerUserId: string) =>
  api.post(`/chat/conversations/direct/${peerUserId}/open`);

export const listConversationPreviews = () =>
  api.get("/chat/conversations/previews");

export const sendMessage = (payload: {
  conversationId: string;
  receiverId: string;
  text: string;
  clientMessageId: string;
  notifyUser?: boolean;
}) => api.post("/chat/messages", payload);

export const fetchThread = (conversationId: string, params?: { before?: string; limit?: number }) =>
  api.get(`/chat/messages/thread/${conversationId}`, { params });

export const markDelivered = (messageIds: string[]) =>
  api.patch("/chat/messages/delivered", { messageIds });

export const markSeen = (payload: {
  conversationId: string;
  peerUserId: string;
  lastSeenMessageId: string;
}) => api.patch("/chat/messages/seen", payload);

export const markAllPendingDelivered = async () => {
  return api.post("/chat/messages/mark-delivered-all");
};

// ✅ NEW: upload multiple chat files (max 10, each <= 50MB backend enforced)
export const uploadChatMediaMultiple = async (files: Array<{
  uri: string;
  name: string;
  type: string;
}>) => {
  const form = new FormData();
  files.forEach((f) => {
    form.append("files", {
      uri: f.uri,
      name: f.name || "file",
      type: f.type || "application/octet-stream",
    } as any);
  });

  return api.post("/chat/messages/upload-multiple", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};