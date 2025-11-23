import express from "express";
import multer from "multer";
import {
  submitProof
} from "../controllers/ProofController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";
const upload = multer({ dest: "uploads/" });
const router = express.Router();

router.post("/", upload.single("proof"),isAuthenticatedUser, submitProof); // form-data: proof + habitId

export default router;