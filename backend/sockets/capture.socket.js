import { registerCaptureEventHandlers } from "../sockets/captureEvent.sockets.js";

export default function registerCaptureSocket(io, socket) {
  registerCaptureEventHandlers(io, socket);
}