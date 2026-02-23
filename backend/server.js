import express from 'express';
import cors from 'cors';
import mongoose from "mongoose";
import apiKeyMiddleware from './middlewares/api-middleware.js';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import nodemailer from "nodemailer"
import errorMiddleware from "./utils/errorMiddleware.js"
import https from 'https';
import fs from 'fs';
import cron from 'node-cron';


const app = express();
// Load environment based on NODE_ENV
const envFile = `.env.${process.env.NODE_ENV || ''}`;
dotenv.config({ path: envFile });

//Connection Database
let DB_URL = process.env.MONGO_URI;
const connectDatabase = () => { 
    mongoose.connect(DB_URL)
    .then((con) => {
        console.log('connected with database',DB_URL);
    })
    .catch(err => console.error("error:",err));    
};

connectDatabase()

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

import path from 'path';
// This should be at the TOP, before app.listen and after creating app.
const AVATAR_PATH = path.join(process.cwd(), 'uploads', 'avatars');
app.use('/avatars', express.static(AVATAR_PATH));

//import routes
import AuthRoutes from "./routes/AuthRoutes.js"
import DashboardRoutes from "./routes/DashboardRoutes.js"
import HabitRoutes from "./routes/HabitRoutes.js"
import MoodRoutes from "./routes/MoodRoutes.js"
import ProofRoutes from "./routes/ProofRoutes.js"
import SocialRoutes from "./routes/SocialRoutes.js"
import ProfileRoutes from "./routes/ProfileRoutes.js"
import LeaderboardRoutes from "./routes/LeaderboardRoutes.js"
import E2EERoutes from "./routes/e2eeRoutes.js"
import FriendRoutes from "./routes/FriendsRoutes.js"
import PushRoutes from "./routes/NotificationRoutes.js"
import LocationRoutes from "./routes/LocationRoutes.js"

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(cors());
app.use("/api", apiKeyMiddleware);
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
app.use(errorMiddleware)


// Pick port based on environment
const ENV = process.env.NODE_ENV;
const PORT = ENV === 'development' ? 40000 : 8080;

// Test route
app.get('/health', (req, res) => {
  res.send(`Backend API is running on ${PORT} in ${ENV} mode🚀`);
});

// HTTPS options (Cloudflare origin certificate)
// const sslOptions = {
//   key: fs.readFileSync('./certs/key.pem'),
//   cert: fs.readFileSync('./certs/cert.pem'),
// };

// Start HTTPS server
// const server = https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
//   console.log(`Server running on https://0.0.0.0:${PORT} in ${ENV} mode`);
// });

import { runMonthlyReset } from './helpers/monthlyReset.js'; // adjust path

cron.schedule('0 0 0 1 * *', async () => {
  console.log('[cron] Monthly reset started (PKT midnight)');
  try {
    await runMonthlyReset();
    console.log('[cron] Monthly reset finished');
  } catch (err) {
    console.error('[cron] Monthly reset failed:', err);
  }
}, {
  timezone: 'UTC',
});

// Graceful shutdown handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Remove https and sslOptions
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} in ${ENV} mode`);
});
