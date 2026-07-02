export default function registerPresenceSocket(io, socket) {
  const userId = socket.userId;

  socket.join(`user:${userId}`);

  console.log(`User ${userId} connected`);

  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
  });
}