import express from "express";

import {
  getCallHistory,
  getCallDetails,
  deleteCall,
  clearCallHistory,
  rejectCallViaApi,
} from "../controllers/CallController.js";

import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

/**
 * GET history
 */
router.get("/history", isAuthenticatedUser, getCallHistory);

/**
 * GET one call
 */
router.get("/:id", isAuthenticatedUser,  getCallDetails);

/**
 * DELETE one call
 */
router.delete("/:id", isAuthenticatedUser, deleteCall);

/**
 * DELETE all history
 */
router.delete("/history/all",isAuthenticatedUser, clearCallHistory);

router.post('/reject', rejectCallViaApi);

export default router;