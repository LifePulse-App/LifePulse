import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  registerDevice,
  getDevicesByUser,
  getDeviceById,
  topupPrekeys,
  storeMessage,
  pullMessages,
  getConversations,
  getThread,
  markMessagesAsRead,
} from "../controllers/e2eeController.js";

const router = express.Router();

// Devices
router.post("/devices/register", isAuthenticatedUser, registerDevice);
router.get("/devices/user/:userId", isAuthenticatedUser, getDevicesByUser); // list bundles to fan-out to recipient devices
router.get("/devices/id/:deviceId", isAuthenticatedUser, getDeviceById);    // fetch your own device
router.post("/devices/prekeys", isAuthenticatedUser, topupPrekeys);

// Messages
router.post("/messages", isAuthenticatedUser, storeMessage);
router.get("/messages", isAuthenticatedUser, pullMessages);

// Conversations
router.get("/conversations", isAuthenticatedUser, getConversations);

// GET /e2ee/messages/thread/:peerUserId
router.get("/messages/thread/:peerUserId",isAuthenticatedUser, getThread);

router.patch('/messages/markRead', isAuthenticatedUser, markMessagesAsRead);

export default router;