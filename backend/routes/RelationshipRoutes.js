import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  sendRelationshipRequest,
  acceptRelationshipRequest,
  cancelRelationshipRequest,
  removeRelationship,
  restoreRelationship
} from "../controllers/FriendController.js";

const router = express.Router();

// --- ⚡ Relationship Routes ---
router.post("/request/:targetUserId", isAuthenticatedUser, sendRelationshipRequest);
router.post("/accept/:targetUserId", isAuthenticatedUser, acceptRelationshipRequest);
router.post("/cancel/:targetUserId", isAuthenticatedUser, cancelRelationshipRequest);
router.post("/remove", isAuthenticatedUser, removeRelationship);
router.post("/restore", isAuthenticatedUser, restoreRelationship);

export default router;