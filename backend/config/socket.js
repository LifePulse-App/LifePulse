import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import registerSocketEvents from "../sockets/index.js";
import socketAuth from "../middlewares/socketAuth.js";
import { initializeRedis } from "./redis.js";

let io = null;

export async function initializeSocket(server) {

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  // Initialize Redis
  const { pubClient, subClient } = await initializeRedis();

  io.adapter(createAdapter(pubClient, subClient));

  console.log("✅ Socket.IO Redis Adapter Enabled");

  io.use(socketAuth);

  registerSocketEvents(io);

  return io;
}

export function getIO() {
  return io;
}