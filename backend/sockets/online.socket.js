import OnlineManager from "../managers/OnlineManager.js";

export function registerOnlineHandlers(io, socket) {
  const userId = socket.userId;
  if (!userId) return;

  // Register the user to their cluster-wide room
  OnlineManager.register(socket, userId);
}