import { verifyUserFromToken } from "../utils/verifyJwt.js";

export default async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    const user = await verifyUserFromToken(token);

    socket.user = user;
    socket.userId = user._id.toString();

    next();
  } catch (err) {
    console.error("Socket Auth Error:", err.message);
    next(new Error("Unauthorized"));
  }
}