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
} from "../controllers/FriendController.js";

const router = express.Router();

// Send a friend request
router.post("/request/:targetUserId", isAuthenticatedUser, sendFriendRequest);

// Accept a friend request (requesterId -> me)
router.post("/accept/:requesterId", isAuthenticatedUser, acceptFriendRequest);

// Remove/decline/cancel a pending request
router.post("/remove/:requesterId", isAuthenticatedUser, removeFriendRequest);

// Unfriend
router.post("/unfriend/:userId", isAuthenticatedUser, unfriend);

// Friend status flags for a target user
router.get("/status/:userId", isAuthenticatedUser, friendStatus);

// My friends list
router.get("/list", isAuthenticatedUser, listFriends);

// Incoming pending requests
router.get("/pending", isAuthenticatedUser, pendingFriendRequests);

// Search users with friend flags (?q=)
router.get("/search", isAuthenticatedUser, searchUsers);

// Suggested friends
router.get("/suggested", isAuthenticatedUser, suggestedFriends);

router.get("/preview/:userId", isAuthenticatedUser, previewProfile);

export default router;