class OnlineManager {
  constructor() {
    this.userSockets = new Map();
    this.socketUsers = new Map();
    this.lastSeen = new Map();
  }

  register(userId, socketId) {
    userId = String(userId);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }

    this.userSockets.get(userId).add(socketId);
    this.socketUsers.set(socketId, userId);
    this.lastSeen.set(userId, Date.now());

    console.log(
      `🟢 ${userId} connected (${this.userSockets.get(userId).size} devices)`
    );
  }

  unregister(socketId) {
    const userId = this.socketUsers.get(socketId);

    if (!userId) return;

    const sockets = this.userSockets.get(userId);

    if (sockets) {
      sockets.delete(socketId);

      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.lastSeen.set(userId, Date.now());

        console.log(`🔴 ${userId} offline`);
      }
    }

    this.socketUsers.delete(socketId);
  }

  isOnline(userId) {
    return this.userSockets.has(String(userId));
  }

  getSocketIds(userId) {
    return [...(this.userSockets.get(String(userId)) || [])];
  }

  // Added so CallSocket.js works without changes
  getUserSockets(userId) {
    return this.userSockets.get(userId.toString()) || new Set();
  }

  getFirstSocket(userId) {
    const sockets = this.getUserSockets(userId);
    return sockets.size ? [...sockets][0] : null;
  }

  getUserId(socketId) {
    return this.socketUsers.get(socketId);
  }

  emitToUser(io, userId, event, data) {
    const sockets = this.getSocketIds(userId);

    sockets.forEach((socketId) => {
      io.to(socketId).emit(event, data);
    });
  }

  broadcast(io, event, data) {
    io.emit(event, data);
  }

  getOnlineUsers() {
    return [...this.userSockets.keys()];
  }

  getOnlineCount() {
    return this.userSockets.size;
  }

  getLastSeen(userId) {
    return this.lastSeen.get(String(userId)) || null;
  }

  touch(userId) {
    this.lastSeen.set(String(userId), Date.now());
  }

  debug() {
    console.log("========== ONLINE USERS ==========");

    for (const [userId, sockets] of this.userSockets.entries()) {
      console.log(userId, [...sockets]);
    }

    console.log("==================================");
  }
}

export default new OnlineManager();