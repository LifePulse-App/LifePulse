class OnlineManager {
  
  // Joins the socket to a room named after the user's ID
  register(socket, userId) {
    socket.join(String(userId));
    console.log(`🟢 ${userId} connected on ${socket.id}`);
  }

  // Socket.IO handles leaving rooms automatically on disconnect
  unregister(socket) {
    console.log(`🔴 Socket ${socket.id} disconnected`);
  }

  // Queries the Redis cluster to see if the user is connected to ANY instance
  async isOnline(io, userId) {
    const sockets = await io.in(String(userId)).fetchSockets();
    return sockets.length > 0;
  }

  // Emits an event to all devices a user is logged into, across the cluster
  emitToUser(io, userId, event, data) {
    io.to(String(userId)).emit(event, data);
    return true;
  }

  // Emits to all devices EXCEPT the one specified (good for "answered elsewhere" logic)
  emitToUserExcept(io, userId, exceptSocketId, event, data) {
    io.to(String(userId)).except(exceptSocketId).emit(event, data);
    return true;
  }
}

export default new OnlineManager();