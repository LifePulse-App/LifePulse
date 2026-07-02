const activeCalls = new Map();

/*
activeCalls

callId => {
    callerId,
    receiverId,
    startedAt
}
*/

function createCallId(callerId, receiverId) {
  return [callerId.toString(), receiverId.toString()].sort().join("_");
}

export function registerSignalingHandlers(io, socket) {

  /*
  =============================
          START CALL
  =============================
  */

  socket.on("call:start", async ({ receiverId, type }) => {

    try {

      const callerId = socket.userId?.toString();

      if (!callerId || !receiverId) return;

      if (!["voice", "video"].includes(type)) return;

      const callId = createCallId(callerId, receiverId);

      if (activeCalls.has(callId)) {

        socket.emit("call:busy");

        return;
      }

      activeCalls.set(callId, {
        callerId,
        receiverId,
        startedAt: Date.now(),
      });

      io.to(`user:${receiverId}`).emit("incoming-call", {
        callerId,
        callId,
        type,
      });

      socket.emit("call:calling", {
        callId,
      });

      console.log("📞 Call Started", callerId, "->", receiverId);

    } catch (err) {

      console.error(err);

      socket.emit("call:error");

    }

  });

  /*
  =============================
          ACCEPT CALL
  =============================
  */

  socket.on("call:accept", ({ callerId }) => {

    const receiverId = socket.userId.toString();

    const callId = createCallId(callerId, receiverId);

    if (!activeCalls.has(callId)) return;

    io.to(`user:${callerId}`).emit("call:accepted", {

      receiverId,

      callId,

    });

    console.log("✅ Call Accepted");

  });

  /*
  =============================
          REJECT CALL
  =============================
  */

  socket.on("call:reject", ({ callerId }) => {

    const receiverId = socket.userId.toString();

    const callId = createCallId(callerId, receiverId);

    activeCalls.delete(callId);

    io.to(`user:${callerId}`).emit("call:rejected", {

      receiverId,

      callId,

    });

    console.log("❌ Call Rejected");

  });

  /*
  =============================
            END CALL
  =============================
  */

  socket.on("call:end", ({ peerId }) => {

    const myId = socket.userId.toString();

    const callId = createCallId(myId, peerId);

    activeCalls.delete(callId);

    io.to(`user:${peerId}`).emit("call:ended");

    socket.emit("call:ended");

    console.log("☎️ Call Ended");

  });

  /*
  =============================
         WEBRTC OFFER
  =============================
  */

  socket.on("webrtc:offer", ({ receiverId, sdp }) => {

    io.to(`user:${receiverId}`).emit("webrtc:offer", {

      senderId: socket.userId,

      sdp,

    });

  });

  /*
  =============================
        WEBRTC ANSWER
  =============================
  */

  socket.on("webrtc:answer", ({ receiverId, sdp }) => {

    io.to(`user:${receiverId}`).emit("webrtc:answer", {

      senderId: socket.userId,

      sdp,

    });

  });

  /*
  =============================
        ICE CANDIDATE
  =============================
  */

  socket.on("webrtc:ice", ({ receiverId, candidate }) => {

    io.to(`user:${receiverId}`).emit("webrtc:ice", {

      senderId: socket.userId,

      candidate,

    });

  });

  /*
  =============================
          DISCONNECT
  =============================
  */

  socket.on("disconnect", () => {

    const myId = socket.userId?.toString();

    if (!myId) return;

    for (const [callId, call] of activeCalls.entries()) {

      if (
        call.callerId === myId ||
        call.receiverId === myId
      ) {

        const peer =
          call.callerId === myId
            ? call.receiverId
            : call.callerId;

        io.to(`user:${peer}`).emit("call:ended");

        activeCalls.delete(callId);
      }
    }

  });

}