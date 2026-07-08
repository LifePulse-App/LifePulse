export default function registerPresenceSocket(io, socket) {
  const userId = socket.userId;

  socket.join(`user:${userId}`);

  console.log(`🟢 User ${userId} connected`);

  socket.on("disconnect", (reason) => {
    console.log(`🔴 User ${userId} disconnected`);
    console.log("Disconnect reason:", reason);
  });

io.on("connection", (socket) => {
    console.log(
        "PID:",
        process.pid,
        "Socket:",
        socket.id,
    );

    socket.conn.on("close", (reason) => {
        console.log(
            "PID:",
            process.pid,
            "Engine close:",
            reason,
        );
    });

    socket.on("disconnect", (reason) => {
        console.log(
            "PID:",
            process.pid,
            "Disconnect:",
            reason,
        );
    });
});
}