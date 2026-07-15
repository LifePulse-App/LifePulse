export default function registerPresenceSocket(io, socket) {
  const userId = socket.userId;
  if (!userId) return;

  // You are already joining the user to a room in OnlineManager,
  // but if you want a specific presence room, you can keep this.
  socket.join(`user:${userId}`);

  console.log(`[PID: ${process.pid}] 🟢 User ${userId} connected on Socket: ${socket.id}`);

  // Catch low-level WebSocket drops (Engine.IO disconnects)
  socket.conn.on("close", (reason) => {
    console.log(`[PID: ${process.pid}] ⚠️ Engine close for Socket ${socket.id}: ${reason}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[PID: ${process.pid}] 🔴 User ${userId} disconnected. Reason: ${reason}`);
  });

  // 💡 Add any custom presence events here (e.g., user manually sets "Away" or "Do Not Disturb")
  // socket.on("presence:set_status", async ({ status }) => {
  //    // Save to DB, then broadcast to friends
  // });
}