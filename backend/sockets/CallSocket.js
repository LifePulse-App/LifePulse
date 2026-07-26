import mongoose from "mongoose";
import User from "../models/UserSchema.js";
import Conversation from "../models/Conversation.js";
import OnlineManager from "../managers/OnlineManager.js";
import Call from "../models/Call.js";
import admin from "firebase-admin"; 
import PushToken from "../models/PushToken.js";
// Make sure to import your Redis clients from wherever you initialized them
import { getRedisClients } from "../config/redis.js"; 

const CALL_TIMEOUT = 30000;
const localTimeouts = new Map(); // Timeouts remain local to the initiating worker

const generateCallId = () => new mongoose.Types.ObjectId().toString();

// --- REDIS STATE HELPERS ---
const setCallState = async (callId, data) => {
    const { pubClient } = getRedisClients();
    await pubClient.set(`call:${callId}`, JSON.stringify(data), { EX: 3600 }); // Expires in 1hr for safety
};

const getCallState = async (callId) => {
    const { pubClient } = getRedisClients();
    const data = await pubClient.get(`call:${callId}`);
    return data ? JSON.parse(data) : null;
};

const deleteCallState = async (callId) => {
    const { pubClient } = getRedisClients();
    await pubClient.del(`call:${callId}`);
};
// ---------------------------

const cleanupCall = async (callId) => {
    if (localTimeouts.has(callId)) {
        clearTimeout(localTimeouts.get(callId));
        localTimeouts.delete(callId);
    }
    await deleteCallState(callId);
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

            // Check online status cluster-wide
            const isReceiverOnline = await OnlineManager.isOnline(io, receiverId);

            // Fetch any existing calls to check for busy status
            // Note: In Redis we don't scan all keys. It's safer to trust the client UI preventing double calls, 
            // or you could map user -> active call in Redis if strict busy checking is needed.
            // For now, if they answer elsewhere, the 'connected' state handles it.

            const callId = generateCallId();
            socket.activeCallId = callId; // Bind call to this socket for disconnect handler

            const timeout = setTimeout(async() => {
                const current = await getCallState(callId);
                if (!current) return;

                if (current.status !== "ringing") {
                    if (localTimeouts.has(callId)) localTimeouts.delete(callId);
                    return; 
                }

                OnlineManager.emitToUser(io, current.callerId, "call:no-answer", { callId, callerId: current.callerId, receiverId: current.receiverId, conversationId: current.conversationId });
                OnlineManager.emitToUser(io, current.receiverId, "call:missed", { callId, callerId: current.callerId, receiverId: current.receiverId, conversationId: current.conversationId });

                // ⚡ FIX: Silences the receiver's phone if they didn't answer in 30 seconds
                sendCallCleanupPush(current.receiverId, callId, "call_missed");

                try {
                    await Call.create({
                        callId, caller: current.callerId, receiver: current.receiverId, conversationId: current.conversationId,
                        type: current.type, status: "missed", startedAt: new Date(current.startedAt), endedAt: new Date(), duration: 0
                    });
                } catch (err) { console.error(err); }

                await cleanupCall(callId);
            }, CALL_TIMEOUT);

            localTimeouts.set(callId, timeout);

            await setCallState(callId, {
                callId, callerId, receiverId, callerSocketId: socket.id,
                receiverSocketId: null, // Socket ID matters less now that we use rooms
                type, conversationId, startedAt: Date.now(), status: "ringing" // Skip straight to ringing
            });

            const caller = await User.findById(callerId).select("name username avatar avatarUrl tick");

            if (isReceiverOnline) {
                console.log("🔵 BACKEND EMITTING call:incoming to receiver socket room:", payload.receiverId); 
                OnlineManager.emitToUser(io, receiverId, "call:incoming", { callId, caller, callerId, conversationId, type });
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
            OnlineManager.emitToUser(io, callerId, "call:ringing", { callId });

            // ⚡ FIX 2A: Pass status: "ringing" directly in the callback
            callback({ success: true, callId, status: "ringing" });

        } catch (err) {
            console.error(err);
            callback({ success: false, message: "Internal error" });
        }
    });

    socket.on("call:cancel", async ({ callId }) => {
        const call = await getCallState(callId);
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

        OnlineManager.emitToUser(io, call.receiverId, "call:cancelled", { callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId });
        
        // ⚡ FIX: Stop the receiver's phone from ringing if the caller hangs up
        sendCallCleanupPush(call.receiverId, callId, "call_cancelled");

        await cleanupCall(callId);
    });

    socket.on("call:accept", async ({ callId }, callback = () => {}) => {
        try {
            const call = await getCallState(callId);
            if (!call) return callback({ success: false, message: "Call not found" });
            if (String(call.receiverId) !== String(socket.userId)) return callback({ success: false, message: "Unauthorized" });

            if (call.status === "connected") return callback({ success: true, alreadyConnected: true });

            if (localTimeouts.has(callId)) {
                clearTimeout(localTimeouts.get(callId));
                localTimeouts.delete(callId);
            }

            call.status = "connected";
            call.receiverSocketId = socket.id;
            socket.activeCallId = callId; // Bind for disconnect
            await setCallState(callId, call);

            OnlineManager.emitToUser(io, call.callerId, "call:accepted", { callId, receiverId: call.receiverId });
            OnlineManager.emitToUser(io, call.receiverId, "call:accepted", { callId, callerId: call.callerId });
            OnlineManager.emitToUserExcept(io, call.receiverId, socket.id, "call:answered-elsewhere", { callId });

            callback({ success: true });

        } catch (e) {
            console.error(e);
            callback({ success: false });
        }
    });

    socket.on("call:reject", async ({ callId }) => {
        const call = await getCallState(callId);
        if (!call) return;
        if (String(call.receiverId) !== String(socket.userId)) return;

        try {
            await Call.findOneAndUpdate(
                { callId: call.callId }, 
                {
                    $setOnInsert: { caller: call.callerId, receiver: call.receiverId, conversationId: call.conversationId, type: call.type, startedAt: new Date(call.startedAt) },
                    $set: { status: "rejected", endedAt: new Date(), duration: 0 }
                },
                { upsert: true, new: true } 
            );
        } catch (err) { console.error("Saving call failed:", err); }

        OnlineManager.emitToUser(io, call.callerId, "call:rejected", { callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId });
        OnlineManager.emitToUserExcept(io, call.receiverId, socket.id, "call:answered-elsewhere", { callId });
        await cleanupCall(callId);
    });

    socket.on("call:busy", async ({ callId }) => {
        const call = await getCallState(callId);
        if (!call) return;
        if (String(call.receiverId) !== String(socket.userId)) return;

        OnlineManager.emitToUser(io, call.callerId, "call:busy", { callId, callerId: call.callerId, receiverId: call.receiverId, conversationId: call.conversationId });
        
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

        await cleanupCall(callId);
    });

    socket.on("call:end", async ({ callId }) => {
        const call = await getCallState(callId);
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
        OnlineManager.emitToUser(io, call.callerId, "call:ended", payload);
        OnlineManager.emitToUser(io, call.receiverId, "call:ended", payload);
        
        // ⚡ FIX: Ensure Notifee banner clears if they were disconnected improperly
        sendCallCleanupPush(call.receiverId, callId, "call_ended");

        await cleanupCall(callId);
    });

    socket.on("call:decline-busy", async ({ callId }) => {
        const call = await getCallState(callId);
        if (!call) return;
        OnlineManager.emitToUser(io, call.callerId, "call:busy", { callId });
        await cleanupCall(callId);
    });

    socket.on("call:get-state", async ({ callId }, callback = () => {}) => {
        const call = await getCallState(callId);
        if (!call) return callback({ exists: false });
        callback({ exists: true, status: call.status, callerId: call.callerId, receiverId: call.receiverId, type: call.type });
    });

    // --- WebRTC Routes ---
    const routeWebRTC = async (eventName, { callId, ...data }) => {
        const call = await getCallState(callId);
        if (!call) return;
        const target = String(socket.userId) === String(call.callerId) ? call.receiverId : call.callerId;
        socket.activeCallId = callId; // Bind just in case
        OnlineManager.emitToUser(io, target, eventName, { callId, ...data });
    };

    socket.on("webrtc:offer", (data) => routeWebRTC("webrtc:offer", data));
    socket.on("webrtc:answer", (data) => routeWebRTC("webrtc:answer", data));
    socket.on("webrtc:ice-candidate", (data) => routeWebRTC("webrtc:ice-candidate", data));
    socket.on("webrtc:renegotiate-offer", (data) => routeWebRTC("webrtc:renegotiate-offer", data));
    socket.on("webrtc:renegotiate-answer", (data) => routeWebRTC("webrtc:renegotiate-answer", data));

    socket.on("call:ringing", async ({ callId }) => {
        const call = await getCallState(callId);
        if (!call) return;
        call.status = "ringing";
        await setCallState(callId, call);
        OnlineManager.emitToUser(io, call.callerId, "call:ringing", { callId });
    });

    socket.on("disconnect", async () => {
        const userId = socket.userId;
        const callId = socket.activeCallId; // ⚡ Used explicit binding instead of Map scanning
        
        if (!callId) return;

        const activeCall = await getCallState(callId);
        if (!activeCall) return;

        // Ensure this user is actually in this call before tearing it down
        if (String(activeCall.callerId) !== String(userId) && String(activeCall.receiverId) !== String(userId)) return;

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

        OnlineManager.emitToUser(io, otherUser, endedEvent, endedPayload);
        
        // ⚡ FIX: Silences the phone if someone's app crashed or internet dropped
        if (!wasConnected) sendCallCleanupPush(otherUser, activeCall.callId, pushType);

        await cleanupCall(activeCall.callId);
    });

    socket.on("call:rejoin", async ({ callId }, callback = () => {}) => {
        const call = await getCallState(callId);
        if (!call) return callback({ success: false });

        const isCaller = String(call.callerId) === String(socket.userId);
        const isReceiver = String(call.receiverId) === String(socket.userId);

        if (!isCaller && !isReceiver) return callback({ success: false, message: "Unauthorized" });

        if (isCaller) call.callerSocketId = socket.id;
        if (isReceiver) call.receiverSocketId = socket.id;
        socket.activeCallId = callId;

        await setCallState(callId, call);
        callback({ success: true, call });
    });
}