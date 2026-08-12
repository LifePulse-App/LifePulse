import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  sendRelationshipRequest,
  acceptRelationshipRequest,
  cancelRelationshipRequest,
  removeRelationship,
  restoreRelationship,
  getMyRelationshipHistory,
  getPartnerRelationshipHistory
} from "../controllers/FriendController.js";

const router = express.Router();

// --- ⚡ Relationship Routes ---
router.post("/request/:targetUserId", isAuthenticatedUser, sendRelationshipRequest);
router.post("/accept/:targetUserId", isAuthenticatedUser, acceptRelationshipRequest);
router.post("/cancel/:targetUserId", isAuthenticatedUser, cancelRelationshipRequest);
router.post("/remove", isAuthenticatedUser, removeRelationship);
router.post("/restore", isAuthenticatedUser, restoreRelationship);

router.get("/history", isAuthenticatedUser, getMyRelationshipHistory);
router.get("/partner-history", isAuthenticatedUser, getPartnerRelationshipHistory);

export default router;