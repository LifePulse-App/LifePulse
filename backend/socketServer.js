import http from "http";
import { Server } from "socket.io";
import app from "./server.js";

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    socket.join(`user:${userId}`);
  });

  socket.on("disconnect", () => {});
});

export { io };
export default server;