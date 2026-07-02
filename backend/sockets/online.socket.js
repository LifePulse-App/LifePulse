import OnlineManager from "../managers/OnlineManager.js";

export function registerOnlineHandlers(io, socket) {

  const userId = socket.userId;

  if (!userId) return;

  OnlineManager.register(userId, socket.id);

  socket.on("heartbeat", () => {
    OnlineManager.touch(userId);
  });

  socket.on("disconnect", () => {
    OnlineManager.unregister(socket.id);
  });

}