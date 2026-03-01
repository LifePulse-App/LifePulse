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