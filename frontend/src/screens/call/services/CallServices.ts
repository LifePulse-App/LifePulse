import { Socket } from "socket.io-client";

class CallService {
  private socket: Socket | null = null;

  init(socket: Socket) {
    this.socket = socket;
  }

  private ensureSocket() {
    if (!this.socket) {
      throw new Error("Socket not initialized.");
    }
  }

  startCall(
    receiverId: string,
    conversationId: string,
    type: "audio" | "video" = "audio"
  ) {
    this.ensureSocket();

    return new Promise((resolve) => {
      this.socket!.emit(
        "call:start",
        {
          receiverId,
          conversationId,
          type,
        },
        (response: any) => {
          resolve(response);
        }
      );
    });
  }

  acceptCall(callId: string) {
    this.ensureSocket();

    return new Promise((resolve) => {
      this.socket!.emit(
        "call:accept",
        { callId },
        (response: any) => {
          resolve(response);
        }
      );
    });
  }

  rejectCall(callId: string) {
    this.ensureSocket();

    this.socket!.emit("call:reject", {
      callId,
    });
  }

  cancelCall(callId: string) {
    this.ensureSocket();

    this.socket!.emit("call:cancel", {
      callId,
    });
  }

  busy(callId: string) {
    this.ensureSocket();

    this.socket!.emit("call:busy", {
      callId,
    });
  }

  endCall(callId: string) {
    this.ensureSocket();

    this.socket!.emit("call:end", {
      callId,
    });
  }

  rejoin(callId: string) {
    this.ensureSocket();

    return new Promise((resolve) => {
      this.socket!.emit(
        "call:rejoin",
        { callId },
        (response: any) => {
          resolve(response);
        }
      );
    });
  }

  getState(callId: string) {
    this.ensureSocket();

    return new Promise((resolve) => {
      this.socket!.emit(
        "call:get-state",
        { callId },
        (response: any) => {
          resolve(response);
        }
      );
    });
  }
}

export default new CallService();