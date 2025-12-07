import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { sendRequest, acceptRequest, listFriends, pendingRequests } from "../controllers/FriendController.js";

const router = express.Router();

router.post("/request/:targetUserId", isAuthenticatedUser, sendRequest);
router.post("/accept/:requesterId", isAuthenticatedUser, acceptRequest);
router.get("/list", isAuthenticatedUser, listFriends);
router.get("/pending", isAuthenticatedUser, pendingRequests);

export default router;