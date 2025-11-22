import express from 'express';
import cors from 'cors';
import mongoose from "mongoose";
import apiKeyMiddleware from './middlewares/api-middleware.js';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import nodemailer from "nodemailer"
import errorMiddleware from "./utils/errorMiddleware.js"

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

// Middlewares
app.use(cookieParser());
app.use(express.json());
app.use(cors());
app.use("/api", apiKeyMiddleware);
app.use("/api/auth", AuthRoutes);
app.use("/api/dashboard", DashboardRoutes);
app.use("/api/habit", HabitRoutes);
app.use("/api/moods", MoodRoutes);
app.use(errorMiddleware)


// Pick port based on environment
const ENV = process.env.NODE_ENV;
const PORT = ENV === 'development' ? 40000 : 8080;

// Test route
app.get('/health', (req, res) => {
  res.send(`Backend API is running on ${PORT} in ${ENV} mode🚀`);
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("Shutting down the server due to unhandledRejection");
  server.close(() => {
     process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("Shutting down due to uncaughtException");
  process.exit(1);
})

app.listen(PORT, () => {
  console.log(`Server running on ${PORT} in ${ENV} mode`);
});