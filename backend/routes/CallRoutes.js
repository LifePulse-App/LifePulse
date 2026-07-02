import express from "express";

import {
  getCallHistory,
  getCallDetails,
  deleteCall,
  clearCallHistory,
} from "../controllers/CallController.js";

import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

router.use(isAuthenticatedUser);

/**
 * GET history
 */
router.get("/history", getCallHistory);

/**
 * GET one call
 */
router.get("/:id", getCallDetails);

/**
 * DELETE one call
 */
router.delete("/:id", deleteCall);

/**
 * DELETE all history
 */
router.delete("/history/all", clearCallHistory);

export default router;