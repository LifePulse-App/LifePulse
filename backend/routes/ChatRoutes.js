import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  openDirectConversation,
  sendMessage,
  getThread,
  markDelivered,
  markSeen,
  listConversationPreviews,
  markDeliveredAll,
} from "../controllers/ChatController.js";

const router = express.Router();

router.post("/conversations/direct/:peerUserId/open", isAuthenticatedUser, openDirectConversation);
router.get("/conversations/previews", isAuthenticatedUser, listConversationPreviews);

router.post("/messages", isAuthenticatedUser, sendMessage);
router.get("/messages/thread/:conversationId", isAuthenticatedUser, getThread);
router.patch("/messages/delivered", isAuthenticatedUser, markDelivered);
router.patch("/messages/seen", isAuthenticatedUser, markSeen);
router.post("/messages/mark-delivered-all", isAuthenticatedUser, markDeliveredAll);

export default router;