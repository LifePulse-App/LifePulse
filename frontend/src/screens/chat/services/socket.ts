import { io } from "socket.io-client";
import apiClient from "../../../auth/api-client/api_client";

// Get base URL without /api
const wsBase = apiClient.getBaseURL().replace(/\/api\/?$/, "");

let socket: any;
export const getSocket = () => {
  if (!socket) {
    socket = io(wsBase, {
      transports: ["websocket"], // for React Native
      autoConnect: false,
      reconnection: true,
    });
  }
  return socket;
};

// Safely close and unset if needed
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};