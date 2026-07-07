import registerPresenceSocket from "./presence.socket.js";
import registerChatSocket from "./chat.socket.js";
import registerTypingSocket from "./typing.socket.js";
import registerCaptureSocket from "./capture.socket.js";
import registerARSocket from "./ar.socket.js";
import registerCallSocket from "./CallSocket.js";
import { registerOnlineHandlers } from "./online.socket.js";
import OnlineManager from "../managers/OnlineManager.js";

export default function registerSocketEvents(io) {
  io.on("connection", (socket) => {

    const userId = socket.userId || socket.user?.id; 

    // 2. Register FIRST before any other module sees the socket
    if (userId) {
     registerOnlineHandlers(io, socket);
    }
 
    console.log("⚡ Connected:", socket.id);

    registerPresenceSocket(io, socket);
    registerChatSocket(io, socket);
    registerTypingSocket(io, socket);
    registerCaptureSocket(io, socket);
    registerARSocket(io, socket);
    registerCallSocket(io, socket);


    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
    });
  });
}