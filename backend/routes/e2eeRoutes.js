import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  registerDevice,
  getDevices,
  topupPrekeys,
  storeMessage,
  pullMessages,
  getConversations,
} from "../controllers/e2eeController.js";

const router = express.Router();

router.post("/devices/register", isAuthenticatedUser, registerDevice);
router.get("/devices/:userId", isAuthenticatedUser, getDevices);
router.post("/devices/prekeys", isAuthenticatedUser, topupPrekeys);

router.post("/messages", isAuthenticatedUser, storeMessage);
router.get("/messages", isAuthenticatedUser, pullMessages);

router.get("/conversations", isAuthenticatedUser, getConversations);

export default router;