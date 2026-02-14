import express from "express";
import { isAuthenticatedUser } from "../middlewares/auth.js";
import {
  updateMyLocation,
  setShareMode,
  getFriendsLocations,
} from "../controllers/LocationController.js";

const router = express.Router();

router.post("/update", isAuthenticatedUser, updateMyLocation);
router.post("/share", isAuthenticatedUser, setShareMode);
router.get("/friends", isAuthenticatedUser, getFriendsLocations);

export default router;