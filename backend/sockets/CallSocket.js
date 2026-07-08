import mongoose from "mongoose";
import User from "../models/UserSchema.js";
import Conversation from "../models/Conversation.js";
import OnlineManager from "../managers/OnlineManager.js";
import Call from "../models/Call.js";
import admin from "firebase-admin"; 
import PushToken from "../models/PushToken.js";

const activeCalls = new Map();
/*
callId => { callerId, receiverId, callerSocketId, receiverSocketId, type, status, startedAt, timeout }
*/

const CALL_TIMEOUT = 30000;

const generateCallId = () => new mongoose.Types.ObjectId().toString();

const emitToUser = (io, userId, event, payload) => {
    const sockets = OnlineManager.getUserSockets(String(userId));
    if (!sockets || sockets.size === 0) return false;
    sockets.forEach(socketId => { io.to(socketId).emit(event, payload); });
    return true;
};

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
    activeCalls.delete(callId);
};

// ⚡ NEW HELPER: Sends a silent push to violently kill the Notifee ringtone on the locked phone
const sendCallCleanupPush = async (receiverId, callId, eventType) => {
    try {
        const pushTokens = await PushToken.find({
            userId: receiverId,
            platform: { $in: ['android', 'ios'] }
        }).lean();

        if (pushTokens && pushTokens.length > 0) {
            for (const device of pushTokens) {
                await admin.messaging().send({
                    token: device.token,
                    data: {
                        type: eventType, // e.g., 'call_cancelled', 'call_missed', 'call_ended'
                        callId: String(callId)
                    },
                    android: { priority: "high" }
                });
            }
        }
    } catch (e) {
        console.log(`Failed to send ${eventType} push:`, e.message);
    }
};

export default function registerCallSocket(io, socket) {

    socket.on("call:start", async (payload, callback = () => {}) => {
        console.log("🔵 BACKEND RECEIVED call:start from user:", socket.user?.id || socket.userId, "to user:", payload.receiverId);
        try {
            const callerId = socket.userId;
            const { receiverId, type = "audio", conversationId } = payload || {};

            if (!receiverId) return callback({ success: false, message: "receiverId required" });
            if (String(receiverId) === String(callerId)) return callback({ success: false, message: "Cannot call yourself" });

            const convo = await Conversation.findOne({ _id: conversationId, participants: { $all: [callerId, receiverId] } }).lean();
            if (!convo) return callback({ success: false, message: "Conversation not found" });

            const receiverSockets = OnlineManager.getUserSockets(String(receiverId));

            const alreadyBusy = [...activeCalls.values()].find(c =>
                (c.status === "ringing" || c.status === "connected") &&
                (String(c.callerId) === String(receiverId) || String(c.receiverId) === String(receiverId))
            );

            if (alreadyBusy) {
                emitToUser(io, callerId, "call:busy", { receiverId });
                return callback({ success: false, message: "User busy" });
            }

            const callId = generateCallId();

            const timeout = setTimeout(async() => {
                const current = activeCalls.get(callId);
                if (!current) return;

                emitToUser(io, current.callerId, "call:no-answer", { callId, callerId: current.callerId, receiverId: current.receiverId, conversationId: current.conversationId });
                emitToUser(io, current.receiverId, "call:missed", { callId, callerId: current.callerId, receiverId: current.receiverId, conversationId: current.conversationId });

                // ⚡ FIX: Silences the receiver's phone if they didn't answer in 30 seconds
                sendCallCleanupPush(current.receiverId, callId, "call_missed");

                try {
                    await Call.create({
                        callId, caller: current.callerId, receiver: current.receiverId, conversationId: current.conversationId,
                        type: current.type, status: "missed", startedAt: new Date(current.startedAt), endedAt: new Date(), duration: 0
                    });
                } catch (err) { console.error(err); }

                cleanupCall(callId);
            }, CALL_TIMEOUT);

            activeCalls.set(callId, {
                callId, callerId, receiverId, callerSocketId: socket.id,
                receiverSocketId: receiverSockets && receiverSockets.size > 0 ? [...receiverSockets][0] : null,
                type, conversationId, startedAt: Date.now(), status: "connecting", timeout
            });

            const caller = await User.findById(callerId).select("name username avatar avatarUrl tick");

            if (receiverSockets && receiverSockets.size > 0) {
                console.log("🔵 BACKEND EMITTING call:incoming to receiver socket room:", payload.receiverId); 
                emitToUser(io, receiverId, "call:incoming", { callId, caller, callerId, conversationId, type });
            } else {
                const pushTokens = await PushToken.find({ userId: receiverId, platform: { $in: ['android', 'ios'] } }).lean();
                
                if (pushTokens && pushTokens.length > 0) {
                    console.log(`🟠 USER OFFLINE: Waking device(s) via FCM Data Push for ${pushTokens.length} devices...`);
                    for (const device of pushTokens) {
                        try {
                            await admin.messaging().send({
                                token: device.token,
                                data: { type: "incoming_call", callId: String(callId), callerId: String(callerId), callerName: String(caller.name || "User"), conversationId: String(conversationId) },
                                android: { priority: "high", ttl: 30000 }
                            });
                        } catch (e) {
                            console.error("🔴 FCM Wakeup Failed for token:", device.token, e.message);
                            if (e.code === 'messaging/registration-token-not-registered') await PushToken.deleteOne({ token: device.token });
                        }
                    }
                } else {
                    console.log("🟠 USER OFFLINE: No FCM Token found. Waiting for timeout.");
                }
            }

            // ⚡ FIX: INSTANT RINGING FEEDBACK
            // Update the backend state to ringing and instantly tell the caller's screen to swap to "Ringing"
            const call = activeCalls.get(callId);
            if (call) call.status = "ringing";
            emitToUser(io, callerId, "call:ringing", { callId });

            // ⚡ FIX 2A: Pass status: "ringing" directly in the callback
            callback({ success: true, callId, status: "ringing" });

        } catch (err) {
            console.error(err);
            callback({ success: false, message: "Internal error" });
        }
    });

    socket.on("call:cancel", async ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;
        if (String(call.callerId) !== String(socket.userId)) return;

        try {
            await Call.findOneAndUpdate(
                { callId: call.callId }, 
                {
                    $setOnInsert: { caller: call.callerId, receiver: call.receiverId, conversationId: call.conversationId, type: call.type, startedAt: new Date(call.startedAt) },
                    $set: { status: "cancelled", endedAt: new Date(), duration: 0 }
                },
                { upsert: true, new: true } 
            );
        } catch (err) { console.error("Saving call failed:", err); }

        emitToUser(io, call.receiverId, "call:cancelled", { callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId });
        
        // ⚡ FIX: Stop the receiver's phone from ringing if the caller hangs up
        sendCallCleanupPush(call.receiverId, callId, "call_cancelled");

        cleanupCall(callId);
    });

    socket.on("call:accept", ({ callId }, callback = () => {}) => {
        try {
            const call = activeCalls.get(callId);
            if (!call) return callback({ success: false, message: "Call not found" });
            if (String(call.receiverId) !== String(socket.userId)) return callback({ success: false, message: "Unauthorized" });

            if (call.status === "connected") return callback({ success: true, alreadyConnected: true });

            if (call.timeout) {
                clearTimeout(call.timeout);
                call.timeout = null;
            }

            call.status = "connected";
            call.receiverSocketId = socket.id;
            activeCalls.set(callId, call);

            emitToUser(io, call.callerId, "call:accepted", { callId, receiverId: call.receiverId });
            emitToUser(io, call.receiverId, "call:accepted", { callId, callerId: call.callerId });
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
            await Call.findOneAndUpdate(
                { callId: call.callId }, 
                {
                    $setOnInsert: { caller: call.callerId, receiver: call.receiverId, conversationId: call.conversationId, type: call.type, startedAt: new Date(call.startedAt) },
                    // ⚡ FIX: Corrected "rejecte" typo to "rejected"
                    $set: { status: "rejected", endedAt: new Date(), duration: 0 }
                },
                { upsert: true, new: true } 
            );
        } catch (err) { console.error("Saving call failed:", err); }

        emitToUser(io, call.callerId, "call:rejected", { callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId });
        emitToUserExcept(io, call.receiverId, socket.id, "call:answered-elsewhere", { callId });
        cleanupCall(callId);
    });

    socket.on("call:busy", async ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;
        if (String(call.receiverId) !== String(socket.userId)) return;

        if (call.timeout) clearTimeout(call.timeout);

        emitToUser(io, call.callerId, "call:busy", { callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId });
        
        try {
            await Call.findOneAndUpdate(
                { callId: call.callId }, 
                {
                    $setOnInsert: { caller: call.callerId, receiver: call.receiverId, conversationId: call.conversationId, type: call.type, startedAt: new Date(call.startedAt) },
                    $set: { status: "busy", endedAt: new Date(), duration: 0 }
                },
                { upsert: true, new: true } 
            );
        } catch (err) { console.error("Saving call failed:", err); }

        cleanupCall(callId);
    });

    socket.on("call:end", async ({ callId }) => {
        const call = activeCalls.get(callId);
        if (!call) return;

        const duration = Math.max(0, Math.floor((Date.now() - call.startedAt) / 1000));

        try {
            await Call.findOneAndUpdate(
                { callId: call.callId }, 
                {
                    $setOnInsert: { caller: call.callerId, receiver: call.receiverId, conversationId: call.conversationId, type: call.type, startedAt: new Date(call.startedAt) },
                    $set: { status: "completed", endedAt: new Date(), duration: duration }
                },
                { upsert: true, new: true } 
            );
        } catch (err) { console.error("Saving call failed:", err); }

        const payload = { callId, duration, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId };
        emitToUser(io, call.callerId, "call:ended", payload);
        emitToUser(io, call.receiverId, "call:ended", payload);
        
        // ⚡ FIX: Ensure Notifee banner clears if they were disconnected improperly
        sendCallCleanupPush(call.receiverId, callId, "call_ended");

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
        if (!call) return callback({ exists: false });
        callback({ exists: true, status: call.status, callerId: call.callerId, receiverId: call.receiverId, type: call.type });
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
        if (activeCall.timeout) clearTimeout(activeCall.timeout);

        const otherUser = String(activeCall.callerId) === String(userId) ? activeCall.receiverId : activeCall.callerId;
        const wasConnected = activeCall.status === "connected";
        const isCallerDisconnecting = String(activeCall.callerId) === String(userId);

        let status;
        let duration = 0;
        let endedEvent = "call:ended";
        let endedPayload = { callId: activeCall.callId, reason: "disconnect" };
        let pushType = "call_ended";

        if (wasConnected) {
            status = "ended";
            duration = Math.max(0, Math.floor((Date.now() - activeCall.startedAt) / 1000));
        } else if (isCallerDisconnecting) {
            status = "cancelled";
            endedEvent = "call:cancelled";
            pushType = "call_cancelled";
            endedPayload = { callId: activeCall.callId, callerId: activeCall.callerId, receiverId: activeCall.receiverId, conversationId: activeCall.conversationId };
        } else {
            status = "missed";
            endedEvent = "call:missed";
            pushType = "call_missed";
            endedPayload = { callId: activeCall.callId, callerId: activeCall.callerId, receiverId: activeCall.receiverId, conversationId: activeCall.conversationId };
        }

       try {
            await Call.findOneAndUpdate(
                { callId: activeCall.callId }, 
                {
                    $setOnInsert: { caller: activeCall.callerId, receiver: activeCall.receiverId, conversationId: activeCall.conversationId, type: activeCall.type, startedAt: new Date(activeCall.startedAt) },
                    $set: { status: status, endedAt: new Date(), duration: duration }
                },
                { upsert: true, new: true } 
            );
        } catch (err) { console.error("Saving call failed:", err); }

        emitToUser(io, otherUser, endedEvent, endedPayload);
        
        // ⚡ FIX: Silences the phone if someone's app crashed or internet dropped
        if (!wasConnected) sendCallCleanupPush(otherUser, activeCall.callId, pushType);

        cleanupCall(activeCall.callId);
    });

    socket.on("call:rejoin", ({ callId }, callback = () => {}) => {
        const call = activeCalls.get(callId);
        if (!call) return callback({ success: false });

        const isCaller = String(call.callerId) === String(socket.userId);
        const isReceiver = String(call.receiverId) === String(socket.userId);

        if (!isCaller && !isReceiver) return callback({ success: false, message: "Unauthorized" });

        if (isCaller) call.callerSocketId = socket.id;
        if (isReceiver) call.receiverSocketId = socket.id;

        activeCalls.set(callId, call);
        callback({ success: true, call });
    });
}