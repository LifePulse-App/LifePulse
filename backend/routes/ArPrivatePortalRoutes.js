import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  createPrivatePortal,
  joinPrivatePortal,
  requestToJoinPortal,
  getPortalJoinRequests,
  reviewJoinRequest,
  getMyPortals,
  postPrivateArMessage,
  getPrivateArMessages,
  reactToPrivateArMessage,
} from "../controllers/ArPrivatePortalController.js";

const router = express.Router();

router.post("/create", isAuthenticatedUser, createPrivatePortal);
router.post("/join", isAuthenticatedUser, joinPrivatePortal);
router.post("/request-join", isAuthenticatedUser, requestToJoinPortal);
router.get("/join-requests/:portalId", isAuthenticatedUser, getPortalJoinRequests); // creator only
router.post("/review-join-request/:portalId", isAuthenticatedUser, reviewJoinRequest); // creator only
router.get("/my-portals", isAuthenticatedUser, getMyPortals);
router.post("/message", isAuthenticatedUser, postPrivateArMessage);
router.get("/messages/:portalId", isAuthenticatedUser, getPrivateArMessages);
router.post("/react", isAuthenticatedUser, reactToPrivateArMessage);

export default router;