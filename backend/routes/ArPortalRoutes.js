import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import { deleteMessage, deleteSpot, reactToArMessage } from "../controllers/ArPortalController.js";
import {
  createSpot,
  listNearbySpots,
  getSpotMessages,
  postSpotMessage,
} from "../controllers/ArPortalController.js";

const router = express.Router();

// spots
router.post("/spots", isAuthenticatedUser, createSpot);
router.get("/spots/nearby", listNearbySpots);
router.get("/spots/:spotId/messages", getSpotMessages);
router.post("/spots/:spotId/messages", isAuthenticatedUser, postSpotMessage);

// message reactions (optional to keep)
router.post("/react", isAuthenticatedUser, reactToArMessage);

// Ensure routes include:
router.delete("/spots/:spotId", isAuthenticatedUser, deleteSpot);
router.delete("/messages/:messageId", isAuthenticatedUser, deleteMessage);

export default router;