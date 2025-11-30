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
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS,
  },
});

//import routes
import AuthRoutes from "./routes/AuthRoutes.js"
import DashboardRoutes from "./routes/DashboardRoutes.js"
import HabitRoutes from "./routes/HabitRoutes.js"
import MoodRoutes from "./routes/MoodRoutes.js"
import ProofRoutes from "./routes/ProofRoutes.js"
import SocialRoutes from "./routes/SocialRoutes.js"
import ProfileRoutes from "./routes/ProfileRoutes.js"
import { log } from 'console';

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
app.use(errorMiddleware)


// Pick port based on environment
const ENV = process.env.NODE_ENV;
const PORT = ENV === 'development' ? 40000 : 8080;

// Test route
app.get('/health', (req, res) => {
  res.send(`Backend API is running on ${PORT} in ${ENV} mode🚀`);
});

// HTTPS options (Cloudflare origin certificate)
const sslOptions = {
  key: fs.readFileSync('C:/cloudflared/certs/key.pem'),
  cert: fs.readFileSync('C:/cloudflared/certs/cert.pem'),
};

console.log(sslOptions);

// Start HTTPS server
const server = https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT} in ${ENV} mode`);
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