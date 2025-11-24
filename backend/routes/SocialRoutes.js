import express from "express";
const router = express.Router();
import {isAuthenticatedUser } from "../middlewares/auth.js"
import { follow, followAccept, followStatus, followersList, followingList, getFollowRequests, removeRequest, search, specificuser, unfollow } from "../controllers/SocialController.js";

router.route("/follow/:userId/:currentUserId").post(isAuthenticatedUser, follow)
router.route("/follow-status/:userId/:currentUserId").get(isAuthenticatedUser, followStatus)
router.route("/accept-request/:userId/:requesterId").post(isAuthenticatedUser, followAccept)
router.route("/remove-request/:userId/:requesterId").post(isAuthenticatedUser, removeRequest)
router.route("/follow-requests").get(isAuthenticatedUser, getFollowRequests)
router.route("/followers/:userId").get(isAuthenticatedUser, followersList)
router.route("/following/:userId").get(isAuthenticatedUser, followingList)
router.route("/unfollow/:userId/:currentUserId").post(isAuthenticatedUser, unfollow)
router.route("/user/:id").get(isAuthenticatedUser, specificuser)
router.route("/search").get(isAuthenticatedUser,search)

export default router;