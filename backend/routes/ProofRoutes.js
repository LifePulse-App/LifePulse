import express from "express";
import multer from "multer";
import {
  submitProof,
  listProofs,
  getProof,
  verifyProof,
} from "../controllers/ProofController.js";
const upload = multer({ dest: "uploads/" });
const router = express.Router();

router.post("/", upload.single("proof"), submitProof); // form-data: proof + habitId
router.get("/", listProofs); // ?habitId=optional
router.get("/:id", getProof);
router.post("/:id/verify", verifyProof); // manual verify

export default router;