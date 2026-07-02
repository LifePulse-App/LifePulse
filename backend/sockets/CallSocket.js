import mongoose from "mongoose";
import User from "../models/UserSchema.js";
import Conversation from "../models/Conversation.js";
import OnlineManager from "../managers/OnlineManager.js";
import Call from "../models/Call.js";
import admin from "firebase-admin"; // ⚡ Make sure Firebase Admin is initialized in your server!

const activeCalls = new Map();
/*
callId =>
{
    callerId,
    receiverId,
    callerSocketId,
    receiverSocketId,
    type,
    status,
    startedAt,
    timeout
}
*/

const CALL_TIMEOUT = 30000;

const generateCallId = () =>
    new mongoose.Types.ObjectId().toString();

const emitToUser = (io, userId, event, payload) => {
    const sockets = OnlineManager.getUserSockets(String(userId));

    if (!sockets || sockets.size === 0) return false;

    sockets.forEach(socketId => {
        io.to(socketId).emit(event, payload);
    });

    return true;
};

// Same as emitToUser, but skips a given socket id. Used so a user's
// *other* devices can be told "this call was handled elsewhere"
// without re-notifying the device that just performed the action.
const emitToUserExcept = (io, userId, exceptSocketId, event, payload) => {
    const sockets = OnlineManager.getUserSockets(String(userId));

    if (!sockets || sockets.size === 0) return false;

    sockets.forEach(socketId => {
        if (socketId === exceptSocketId) return;
        io.to(socketId).emit(event, payload);
    });

    return true;
};

const cleanupCall = (callId) => {
    const call = activeCalls.get(callId);
    if (!call) return;
    if (call.timeout) clearTimeout(call.timeout);
    // ⚡ FIX: Removed ringingTimeout logic to ensure the full 30s ring cycle
    activeCalls.delete(callId);
};

export default function registerCallSocket(io, socket) {

    socket.on("call:start", async (payload, callback = () => {}) => {
        console.log("🔵 BACKEND RECEIVED call:start from user:", socket.user?.id || socket.userId, "to user:", payload.receiverId);
        try {

            const callerId = socket.userId;

            const {
                receiverId,
                type = "audio",
                conversationId
            } = payload || {};

            if (!receiverId)
                return callback({
                    success: false,
                    message: "receiverId required"
                });

            if (String(receiverId) === String(callerId))
                return callback({
                    success: false,
                    message: "Cannot call yourself"
                });

            const convo = await Conversation.findOne({
                _id: conversationId,
                participants: {
                    $all: [callerId, receiverId]
                }
            }).lean();

            if (!convo)
                return callback({
                    success: false,
                    message: "Conversation not found"
                });

            const receiverSockets = OnlineManager.getUserSockets(String(receiverId));

            // already busy? (covers both "ringing" — another call is
            // already incoming for them — and "connected" — they're
            // already on a call)
            const alreadyBusy = [...activeCalls.values()].find(c =>
                (c.status === "ringing" || c.status === "connected") &&
                (
                    String(c.callerId) === String(receiverId) ||
                    String(c.receiverId) === String(receiverId)
                )
            );

            if (alreadyBusy) {
                emitToUser(io, callerId, "call:busy", { receiverId });
                return callback({ success: false, message: "User busy" });
            }

            const callId = generateCallId();

            const timeout = setTimeout(async() => {
                const current = activeCalls.get(callId);
                if (!current) return;

                // ⚡ FIX: Enriched payloads so the Call Logs get correctly saved on the frontend
                emitToUser(io, current.callerId, "call:no-answer", { 
                    callId, 
                    callerId: current.callerId, 
                    receiverId: current.receiverId, 
                    conversationId: current.conversationId 
                });
                emitToUser(io, current.receiverId, "call:missed", { 
                    callId, 
                    callerId: current.callerId, 
                    receiverId: current.receiverId, 
                    conversationId: current.conversationId 
                });

                try {
                    await Call.create({
                        callId,
                        caller: current.callerId,
                        receiver: current.receiverId,
                        conversationId: current.conversationId,
                        type: current.type,
                        status: "missed",
                        startedAt: new Date(current.startedAt),
                        endedAt: new Date(),
                        duration: 0
                    });
                } catch (err) {
                    console.error(err);
                }

                cleanupCall(callId);
            }, CALL_TIMEOUT);

            activeCalls.set(callId, {
                callId, callerId, receiverId, callerSocketId: socket.id,
                receiverSocketId: receiverSockets && receiverSockets.size > 0 ? [...receiverSockets][0] : null,
                type, conversationId, startedAt: Date.now(),
                status: "connecting", 
                timeout
            });

            const caller = await User.findById(callerId).select("name username avatar avatarUrl tick");

            // ⚡ THE BACKGROUND WAKEUP FORK
            if (receiverSockets && receiverSockets.size > 0) {
                // User is online, ring normally via WebSockets
                console.log("🔵 BACKEND EMITTING call:incoming to receiver socket room:", payload.receiverId); 
                emitToUser(io, receiverId, "call:incoming", {
                    callId,
                    caller,
                    callerId,
                    conversationId,
                    type
                });
            } else {
                // User is offline, send VoIP push via Firebase
                const receiverData = await User.findById(receiverId).select("fcmToken");
                
                if (receiverData && receiverData.fcmToken) {
                    console.log("🟠 USER OFFLINE: Waking device via FCM Data Push...");
                    
                    try {
                        await admin.messaging().send({
                            token: receiverData.fcmToken,
                            data: {
                                type: "incoming_call",
                                callId: String(callId),
                                callerId: String(callerId),
                                callerName: String(caller.name || "User"),
                                conversationId: String(conversationId)
                            },
                            android: {
                                priority: "high", // CRITICAL to wake Android
                                ttl: 30000 
                            }
                        });
                    } catch (e) {
                        console.error("🔴 FCM Wakeup Failed:", e);
                        // ⚡ FIX: Removed cleanupCall & return false. Let it timeout naturally.
                    }
                } else {
                    console.log("🟠 USER OFFLINE: No FCM Token found. Waiting for timeout.");
                    // ⚡ FIX: Removed cleanupCall & return false. Let it timeout naturally.
                }
            }

            // ⚡ FIX: Always return success: true so the caller's outgoing screen stays active!
            callback({ success: true, callId });

        } catch (err) {
            console.error(err);
            callback({ success: false, message: "Internal error" });
        }
    });

    socket.on("call:cancel", async ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        // Only the caller can cancel a call they placed.
        if (String(call.callerId) !== String(socket.userId)) return;

        try {
            await Call.create({
                callId,
                caller: call.callerId,
                receiver: call.receiverId,
                conversationId: call.conversationId,
                type: call.type,
                status: "cancelled",
                startedAt: new Date(call.startedAt),
                endedAt: new Date(),
                duration: 0
            });
        } catch (err) {
            console.error(err);
        }

        emitToUser(io, call.receiverId, "call:cancelled", { 
            callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId 
        });
        cleanupCall(callId);
    });

    socket.on("call:accept", ({ callId }, callback = () => {}) => {
        try {
            const call = activeCalls.get(callId);

            if (!call) {
                return callback({ success: false, message: "Call not found" });
            }

            if (String(call.receiverId) !== String(socket.userId)) {
                return callback({ success: false, message: "Unauthorized" });
            }

            // Idempotency: if this call was already accepted
            if (call.status === "connected") {
                return callback({ success: true, alreadyConnected: true });
            }

            if (call.timeout) {
                clearTimeout(call.timeout);
                call.timeout = null;
            }

            call.status = "connected";
            call.receiverSocketId = socket.id;

            activeCalls.set(callId, call);

            emitToUser(io, call.callerId, "call:accepted", {
                callId,
                receiverId: call.receiverId
            });

            emitToUser(io, call.receiverId, "call:accepted", {
                callId,
                callerId: call.callerId
            });

            emitToUserExcept(io, call.receiverId, socket.id, "call:answered-elsewhere", { callId });

            callback({ success: true });

        } catch (e) {
            console.error(e);
            callback({ success: false });
        }
    });

    socket.on("call:reject", async ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        if (String(call.receiverId) !== String(socket.userId)) return;

        if (call.timeout) clearTimeout(call.timeout);

        try {
            await Call.create({
                callId,
                caller: call.callerId,
                receiver: call.receiverId,
                conversationId: call.conversationId,
                type: call.type,
                status: "rejected",
                startedAt: new Date(call.startedAt),
                endedAt: new Date(),
                duration: 0
            });
        } catch (err) {
            console.error(err);
        }

        emitToUser(io, call.callerId, "call:rejected", { 
            callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId 
        });
        emitToUserExcept(io, call.receiverId, socket.id, "call:answered-elsewhere", { callId });
        cleanupCall(callId);
    });

    socket.on("call:busy", async ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        if (String(call.receiverId) !== String(socket.userId)) return;

        if (call.timeout) clearTimeout(call.timeout);

        emitToUser(io, call.callerId, "call:busy", {
            callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId
        });
        
        try {
            await Call.create({
                callId,
                caller: call.callerId,
                receiver: call.receiverId,
                conversationId: call.conversationId,
                type: call.type,
                status: "busy",
                startedAt: new Date(call.startedAt),
                endedAt: new Date(),
                duration: 0
            });
        } catch (err) {
            console.error(err);
        }

        cleanupCall(callId);
    });

    socket.on("call:end", async ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        const endedAt = new Date();
        const duration = Math.max(0, Math.floor((Date.now() - call.startedAt) / 1000));

        try {
            await Call.create({
                callId,
                caller: call.callerId,
                receiver: call.receiverId,
                conversationId: call.conversationId,
                type: call.type,
                status: "completed",
                startedAt: new Date(call.startedAt),
                endedAt,
                duration
            });
        } catch (err) {
            console.error("Saving call failed", err);
        }

       const payload = { callId, duration, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId };
        emitToUser(io, call.callerId, "call:ended", payload);
        emitToUser(io, call.receiverId, "call:ended", payload);
        cleanupCall(callId);
    });

    socket.on("call:decline-busy", ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        emitToUser(io, call.callerId, "call:busy", { callId });
        cleanupCall(callId);
    });

    socket.on("call:get-state", ({ callId }, callback = () => {}) => {
        const call = activeCalls.get(callId);

        if (!call) {
            return callback({ exists: false });
        }

        callback({
            exists: true,
            status: call.status,
            callerId: call.callerId,
            receiverId: call.receiverId,
            type: call.type
        });
    });

    socket.on("webrtc:offer", ({ callId, offer }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        const target = String(socket.userId) === String(call.callerId) ? call.receiverId : call.callerId;
        emitToUser(io, target, "webrtc:offer", { callId, offer });
    });

    socket.on("webrtc:answer", ({ callId, answer }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        const target = String(socket.userId) === String(call.callerId) ? call.receiverId : call.callerId;
        emitToUser(io, target, "webrtc:answer", { callId, answer });
    });

    socket.on("webrtc:ice-candidate", ({ callId, candidate }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        const target = String(socket.userId) === String(call.callerId) ? call.receiverId : call.callerId;
        emitToUser(io, target, "webrtc:ice-candidate", { callId, candidate });
    });

    socket.on("webrtc:renegotiate-offer", ({ callId, offer }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        const target = String(socket.userId) === String(call.callerId) ? call.receiverId : call.callerId;
        emitToUser(io, target, "webrtc:renegotiate-offer", { callId, offer });
    });

    socket.on("webrtc:renegotiate-answer", ({ callId, answer }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        const target = String(socket.userId) === String(call.callerId) ? call.receiverId : call.callerId;
        emitToUser(io, target, "webrtc:renegotiate-answer", { callId, answer });
    });

   socket.on("call:ringing", ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        // Note: ringingTimeout was removed for full 30s ringing
        
        call.status = "ringing";
        activeCalls.set(callId, call);
        emitToUser(io, call.callerId, "call:ringing", { callId });
    });

    socket.on("disconnect", async () => {
        const userId = socket.userId;
        const activeCall = [...activeCalls.values()].find(
            c => String(c.callerId) === String(userId) || String(c.receiverId) === String(userId)
        );

        if (!activeCall) return;

        if (activeCall.timeout) {
            clearTimeout(activeCall.timeout);
        }

        const otherUser = String(activeCall.callerId) === String(userId) ? activeCall.receiverId : activeCall.callerId;
        const wasConnected = activeCall.status === "connected";
        const isCallerDisconnecting = String(activeCall.callerId) === String(userId);

        let status;
        let duration = 0;
        let endedEvent = "call:ended";
        let endedPayload = { callId: activeCall.callId, reason: "disconnect" };

        if (wasConnected) {
            status = "ended";
            duration = Math.max(0, Math.floor((Date.now() - activeCall.startedAt) / 1000));
        } else if (isCallerDisconnecting) {
            status = "cancelled";
            endedEvent = "call:cancelled";
            endedPayload = { callId: activeCall.callId, callerId: activeCall.callerId, receiverId: activeCall.receiverId, conversationId: activeCall.conversationId };
        } else {
            status = "missed";
            endedEvent = "call:missed";
            endedPayload = { callId: activeCall.callId, callerId: activeCall.callerId, receiverId: activeCall.receiverId, conversationId: activeCall.conversationId };
        }

        try {
            await Call.create({
                callId: activeCall.callId,
                caller: activeCall.callerId,
                receiver: activeCall.receiverId,
                conversationId: activeCall.conversationId,
                type: activeCall.type,
                status,
                startedAt: new Date(activeCall.startedAt),
                endedAt: new Date(),
                duration
            });
        } catch (err) {
            console.error(err);
        }

        emitToUser(io, otherUser, endedEvent, endedPayload);
        cleanupCall(activeCall.callId);
    });

    socket.on("call:rejoin", ({ callId }, callback = () => {}) => {
        const call = activeCalls.get(callId);

        if (!call) {
            return callback({ success: false });
        }

        const isCaller = String(call.callerId) === String(socket.userId);
        const isReceiver = String(call.receiverId) === String(socket.userId);

        if (!isCaller && !isReceiver) {
            return callback({ success: false, message: "Unauthorized" });
        }

        if (isCaller) call.callerSocketId = socket.id;
        if (isReceiver) call.receiverSocketId = socket.id;

        activeCalls.set(callId, call);
        callback({ success: true, call });
    });
}