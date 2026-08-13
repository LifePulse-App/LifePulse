import express from "express";
import multer from "multer";
import os from "os";
import path from "path";
import {
  submitProof
} from "../controllers/ProofController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

// --- Home Directory Configuration
const HOME_DIR = os.homedir();
const PROOFS_DIR = path.join(HOME_DIR, "uploads", "proofs");

const upload = multer({ dest: PROOFS_DIR });
const router = express.Router();

router.post("/", upload.single("proof"), isAuthenticatedUser, submitProof); // form-data: proof + habitId

export default router;