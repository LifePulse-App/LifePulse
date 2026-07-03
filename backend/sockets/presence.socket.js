export default function registerPresenceSocket(io, socket) {
  const userId = socket.userId;

  socket.join(`user:${userId}`);

  console.log(`🟢 User ${userId} connected`);

  socket.on("disconnect", (reason) => {
    console.log(`🔴 User ${userId} disconnected`);
    console.log("Disconnect reason:", reason);
  });

  socket.conn.on("close", (reason) => {
    console.log("Engine.IO close:", reason);
  });

  socket.conn.on("error", (err) => {
    console.log("Engine.IO error:", err);
  });
}