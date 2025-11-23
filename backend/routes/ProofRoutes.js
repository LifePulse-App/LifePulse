import express from "express";
import multer from "multer";
import {
  submitProof
} from "../controllers/ProofController.js";
const upload = multer({ dest: "uploads/" });
const router = express.Router();

router.post("/", upload.single("proof"), submitProof); // form-data: proof + habitId

export default router;