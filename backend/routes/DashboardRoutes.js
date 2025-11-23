import express from "express";
import { getDashboard } from "../controllers/DashboardController.js";
import { isAuthenticatedUser } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", isAuthenticatedUser, getDashboard);

export default router;
