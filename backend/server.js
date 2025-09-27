import express, { json } from 'express';
import cors from 'cors';
import mongoose from "mongoose";
import apiKeyMiddleware from './middlewares/api-middleware';
require('dotenv').config();
import errorMiddleware from "./utils/errorMiddleware"

const app = express();

//Connection Database
let DB_URL = process.env.DB_Con_String;
export const connectDatabase = () => { 
    mongoose.connect(DB_URL)
    .then((con) => {
        console.log('connected with database',DB_URL);
    })
    .catch(err => console.error("error:",err));    
};

// Middlewares
app.use("/api/v1", apiKeyMiddleware);
app.use(cors());
app.use(json());
connectDatabase();
app.use(cookieParser());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(errorMiddleware);

// Pick port based on environment
const ENV = process.env.NODE_ENV;
const PORT = ENV === 'development' ? 4000 : 3000;  // lowercase 'development', no extra space

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