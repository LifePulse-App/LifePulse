import express from 'express';
import cors from 'cors';
import mongoose from "mongoose";
import apiKeyMiddleware from './middlewares/api-middleware.js';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import errorMiddleware from "./utils/errorMiddleware.js";
import cron from 'node-cron';
import os from "os";
import fs from "fs"; // 👈 Added File System import
import path from "path";
import http from "http";
import { startNotificationJobs } from './jobs/scheduledNotifications.js';
import { getIO, initializeSocket } from "./config/socket.js";

// --- ENV
const app = express();
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, `.env.${process.env.NODE_ENV}`),
});


// --- DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log(`✅ DB Connected [Worker: ${process.env.NODE_APP_INSTANCE || 'Single'}]`);
    
  })
  .catch(err => console.error("DB Error:", err));

// --- Static Directories (Home Directory Setup & Serving)
const HOME_DIR = os.homedir();
const UPLOADS_DIR = path.join(HOME_DIR, "uploads");

const dirsToEnsure = [
  path.join(UPLOADS_DIR, "avatars"),
  path.join(UPLOADS_DIR, "chat"),
  path.join(UPLOADS_DIR, "proofs"),
];

// Automatically create missing folders on host server startup
dirsToEnsure.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created static upload directory: ${dir}`);
  }
});

app.use('/avatars', express.static(path.join(UPLOADS_DIR, "avatars")));
app.use('/chat-media', express.static(path.join(UPLOADS_DIR, "chat")));
app.use('/proofs', express.static(path.join(UPLOADS_DIR, "proofs")));
app.use('/api/uploads', express.static(path.join(UPLOADS_DIR, "proofs")));

// --- Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: "*", // Or specify your frontend URL if hosting locally/live
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "api-key"],
  credentials: true
}));
app.use("/api", apiKeyMiddleware);

// --- Routes
import AuthRoutes from "./routes/AuthRoutes.js";
import DashboardRoutes from "./routes/DashboardRoutes.js";
import HabitRoutes from "./routes/HabitRoutes.js";
import MoodRoutes from "./routes/MoodRoutes.js";
import ProofRoutes from "./routes/ProofRoutes.js";
import SocialRoutes from "./routes/SocialRoutes.js";
import ProfileRoutes from "./routes/ProfileRoutes.js";
import LeaderboardRoutes from "./routes/LeaderboardRoutes.js";
import E2EERoutes from "./routes/e2eeRoutes.js";
import FriendRoutes from "./routes/FriendsRoutes.js";
import RelationshipRoutes from "./routes/RelationshipRoutes.js";
import PushRoutes from "./routes/NotificationRoutes.js";
import LocationRoutes from "./routes/LocationRoutes.js";
import ChatRoutes from "./routes/ChatRoutes.js";
import CallRoutes from "./routes/CallRoutes.js";
import appVersionRoutes from './routes/AppVersion.js';
import AdminRoutes from './routes/AdminRoutes.js';
import ArPortalRoutes from "./routes/ArPortalRoutes.js";
import ArPrivatePortalRoutes from "./routes/ArPrivatePortalRoutes.js";
import ModerationRoutes from "./routes/ModerationRoutes.js";
import VerifyRoutes from "./routes/VerificationRoutes.js";
import WebhookRoutes from "./routes/webhook.js";
import FeedRoutes from "./routes/FeedRoutes.js";

// --- Attach io to req
app.use((req, res, next) => {
  req.io = getIO();
  next();
});

app.use('/api/app', appVersionRoutes);
app.use("/api/auth", AuthRoutes);
app.use("/api/dashboard", DashboardRoutes);
app.use("/api/habit", HabitRoutes);
app.use("/api/moods", MoodRoutes);
app.use("/api/proofs", ProofRoutes);
app.use("/api/social", SocialRoutes);
app.use("/api/profile", ProfileRoutes);
app.use("/api/relationship", RelationshipRoutes);
app.use("/api/leaderboard", LeaderboardRoutes);
app.use("/api/e2ee", E2EERoutes);
app.use("/api/friends", FriendRoutes);
app.use("/api/push", PushRoutes);
app.use("/api/location", LocationRoutes);
app.use("/api/chat", ChatRoutes);
app.use("/api/call", CallRoutes);
app.use("/api/ar-portal", ArPortalRoutes);
app.use("/api/ar-private-portal", ArPrivatePortalRoutes);
app.use("/api/moderate", ModerationRoutes);
app.use("/api/verify", VerifyRoutes);
app.use("/api/feed", FeedRoutes);
app.use("/api/admin", AdminRoutes);
app.use("/webhook", WebhookRoutes);

// --- Health
app.get('/health', (req, res) => {
  res.send(`Backend running 🚀 [Worker: ${process.env.NODE_APP_INSTANCE || 'Single'}]`);
});

// --- Error
app.use(errorMiddleware);

// --- Server
const PORT = Number(process.env.PORT);

const server = http.createServer(app);

(async () => {
  const io = await initializeSocket(server);

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();

// --- CRON
import { runMonthlyReset } from './helpers/monthlyReset.js';

if (process.env.IS_PRIMARY_WORKER === 'true') {
  cron.schedule('0 0 0 1 * *', async () => {
    try {
      console.log('🧹 Running monthly reset on Primary Worker');
      await startNotificationJobs();
      await runMonthlyReset();
    } catch (err) {
      console.error("Cron error:", err);
    }
  }, { timezone: 'UTC' });
}

// --- Errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});