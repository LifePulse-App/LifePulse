import { Server } from "socket.io";
import registerSocketEvents from "../sockets/index.js";
import socketAuth from "../middlewares/socketAuth.js";

let io = null;

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  io.use(socketAuth)
  registerSocketEvents(io);

  return io;
}

export function getIO() {
  return io;
}