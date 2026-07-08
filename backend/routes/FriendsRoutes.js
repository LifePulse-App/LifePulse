import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendRequest,
  unfriend,
  friendStatus,
  listFriends,
  pendingFriendRequests,
  searchUsers,
  suggestedFriends,
  previewProfile,
  // ⚡ ADD THE RELATIONSHIP CONTROLLERS HERE
  sendRelationshipRequest,
  acceptRelationshipRequest,
  cancelRelationshipRequest,
  removeRelationship,
  restoreRelationship
} from "../controllers/FriendController.js";

const router = express.Router();

// --- Friend Routes ---
router.post("/request/:targetUserId", isAuthenticatedUser, sendFriendRequest);
router.post("/accept/:requesterId", isAuthenticatedUser, acceptFriendRequest);
router.post("/remove/:requesterId", isAuthenticatedUser, removeFriendRequest);
router.post("/unfriend/:userId", isAuthenticatedUser, unfriend);
router.get("/status/:userId", isAuthenticatedUser, friendStatus);
router.get("/list", isAuthenticatedUser, listFriends);
router.get("/pending", isAuthenticatedUser, pendingFriendRequests);
router.get("/search", isAuthenticatedUser, searchUsers);
router.get("/suggested", isAuthenticatedUser, suggestedFriends);
router.get("/preview/:userId", isAuthenticatedUser, previewProfile);

export default router;