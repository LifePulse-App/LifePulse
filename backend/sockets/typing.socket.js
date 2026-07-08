export default function registerTypingSocket(io, socket) {

  socket.on("typing", ({ conversationId, userId }) => {

    socket.to(`conversation:${conversationId}`).emit("typing", {
      userId,
    });

  });

  socket.on("stop-typing", ({ conversationId, userId }) => {

    socket.to(`conversation:${conversationId}`).emit("stop-typing", {
      userId,
    });

  });

}