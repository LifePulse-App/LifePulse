import registerPresenceSocket from "./presence.socket.js";
import registerChatSocket from "./chat.socket.js";
import registerTypingSocket from "./typing.socket.js";
import registerCaptureSocket from "./capture.socket.js";
import registerARSocket from "./ar.socket.js";
import registerCallSocket from "./CallSocket.js";
import { registerOnlineHandlers } from "./online.socket.js";

export default function registerSocketEvents(io) {
  io.on("connection", (socket) => {
    console.log("⚡ Connected:", socket.id);

    registerPresenceSocket(io, socket);
    registerChatSocket(io, socket);
    registerTypingSocket(io, socket);
    registerCaptureSocket(io, socket);
    registerARSocket(io, socket);
    registerCallSocket(io, socket);
    registerOnlineHandlers(io, socket);


    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
    });
  });
}