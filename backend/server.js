import express from 'express';
import cors from 'cors';
import mongoose from "mongoose";
import apiKeyMiddleware from './middlewares/api-middleware.js';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import nodemailer from "nodemailer";
import errorMiddleware from "./utils/errorMiddleware.js";
import cron from 'node-cron';
import os from "os";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import { startNotificationJobs } from './jobs/scheduledNotifications.js';

// --- ENV
const app = express();
const envFile = `.env.${process.env.NODE_ENV || ''}`;
dotenv.config({ path: envFile });

// --- DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ DB Connected');
    startNotificationJobs(); // ← add this line
  })
  .catch(err => console.error("DB Error:", err));

// --- Mail
export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// --- Static
const HOME_DIR = os.homedir();
app.use('/avatars', express.static(path.join(HOME_DIR, "uploads", "avatars")));
app.use('/chat-media', express.static(path.join(HOME_DIR, "uploads", "chat")));

// --- Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(cors());
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
import PushRoutes from "./routes/NotificationRoutes.js";
import LocationRoutes from "./routes/LocationRoutes.js";
import ChatRoutes from "./routes/ChatRoutes.js";
import appVersionRoutes from './routes/AppVersion.js';
import adminNotifyRoutes from './routes/AdminNotificationRoutes.js';

// --- Attach io to req
app.use((req, res, next) => {
  req.io = io;
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
app.use("/api/leaderboard", LeaderboardRoutes);
app.use("/api/e2ee", E2EERoutes);
app.use("/api/friends", FriendRoutes);
app.use("/api/push", PushRoutes);
app.use("/api/location", LocationRoutes);
app.use("/api/chat", ChatRoutes);
app.use("/api/admin/notify", adminNotifyRoutes);

// --- Health
app.get('/health', (req, res) => {
  res.send("Backend running 🚀");
});

// --- Error
app.use(errorMiddleware);

// --- Server
const PORT = process.env.NODE_ENV === 'development' ? 40000 : 8080;
const server = http.createServer(app);

// --- SOCKET (ONLY ONE INSTANCE)
const io = new Server(server, {
  cors: { origin: "*" },
});


// --- SOCKET EVENTS
io.on("connection", (socket) => {
  // console.log("⚡ Connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on("join-conversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  // Typing
  socket.on("typing", ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("typing", { userId });
  });

  socket.on("stop-typing", ({ conversationId, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("stop-typing", { userId });
  });

  socket.on("disconnect", () => {
    //  console.log("❌ Disconnected:", socket.id);
  });
});

// --- CRON
import { runMonthlyReset } from './helpers/monthlyReset.js';
cron.schedule('0 0 0 1 * *', async () => {
  try {
    await runMonthlyReset();
  } catch (err) {
    console.error("Cron error:", err);
  }
}, { timezone: 'UTC' });

// --- Errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// --- START
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});