import CaptureEvent from "../models/CaptureEvent.js";
import Conversation from "../models/Conversation.js";
import PushToken from "../models/PushToken.js";
import admin from "../firebaseAdmin.js";
import UserSchema from "../models/UserSchema.js";

// Rate limiting: { userId: { conversationId: count, timestamp } }
const captureRateLimit = new Map();
const RATE_LIMIT = 5; // events per minute
const RATE_WINDOW = 30000; // 30 seconds

/**
 * Check if user has exceeded rate limit
 */
function isRateLimited(userId, conversationId) {
  const key = userId.toString();
  const now = Date.now();

  if (!captureRateLimit.has(key)) {
    captureRateLimit.set(key, {});
  }

  const userLimits = captureRateLimit.get(key);
  const convKey = conversationId.toString();

  if (!userLimits[convKey]) {
    userLimits[convKey] = { count: 0, timestamp: now };
    return false;
  }

  const { count, timestamp } = userLimits[convKey];

  // Reset counter if window has passed
  if (now - timestamp > RATE_WINDOW) {
    userLimits[convKey] = { count: 1, timestamp: now };
    return false;
  }

  // Check if exceeded limit
  if (count >= RATE_LIMIT) {
    return true;
  }

  // Increment count
  userLimits[convKey].count += 1;
  return false;
}

/**
 * Send Firebase Cloud Messaging notification
 */
async function sendPushNotification(userId, capturedBy, type) {
  try {
    // Get user's push tokens
    const pushTokens = await PushToken.find({ userId });
    if (!pushTokens || pushTokens.length === 0) {
      console.log("No push tokens found for user:", userId);
      return;
    }

    // Get capturedBy user name for display
    const capturedByUser = await UserSchema.findById(capturedBy);
    const capturedByName = capturedByUser?.name || "Someone";

    const message = {
      notification: {
        title: "Capture Detected",
        body:
          type === "screenshot"
            ? `${capturedByName} took a screenshot`
            : `${capturedByName} is recording the screen`,
      },
      data: {
        type: "capture_event",
        captureType: type,
        capturedBy: capturedBy.toString(),
        userId: userId.toString(),
        timestamp: new Date().toISOString(),
      },
    };

    // Send to all tokens
    const promises = pushTokens.map((tokenDoc) =>
      admin
        .messaging()
        .send({
          ...message,
          token: tokenDoc.token,
        })
        .catch((error) => {
          console.error("Failed to send push to token:", tokenDoc.token, error);
          // Optionally delete invalid tokens
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            PushToken.deleteOne({ _id: tokenDoc._id }).catch(console.error);
          }
        })
    );

    await Promise.all(promises);
    console.log(`✅ Push sent to ${pushTokens.length} devices for user:`, userId);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

/**
 * Register capture events socket handlers
 */
export function registerCaptureEventHandlers(io, socket) {
  socket.on("capture_event", async (data) => {
    try {
      const { conversationId, type } = data;
      const userId = socket.userId;

      // 1. Validate input
      if (!conversationId || !type) {
        console.warn("Invalid capture_event data:", data);
        return;
      }

      if (!["screenshot", "screen_recording"].includes(type)) {
        console.warn("Invalid capture type:", type);
        return;
      }

      // 2. Validate conversation exists
      const conversation = await Conversation.findById(conversationId).populate(
        "participants"
      );
      if (!conversation) {
        console.warn("Conversation not found:", conversationId);
        return;
      }

      // 3. Validate user is participant
      const isParticipant = conversation.participants.some(
        (p) => p._id.toString() === userId.toString()
      );

      if (!isParticipant) {
        console.warn(
          "User not participant in conversation:",
          conversationId,
          userId
        );
        return;
      }

      // 4. Check rate limit
      if (isRateLimited(userId, conversationId)) {
        console.warn(
          "Rate limit exceeded for user:",
          userId,
          "in conversation:",
          conversationId
        );
        return;
      }

      // 5. Save capture event to MongoDB
      const captureEvent = await CaptureEvent.create({
        conversationId,
        capturedBy: userId,
        type,
      });

      // 6. Identify receivers (all participants except sender)
      const receivers = conversation.participants.filter(
        (p) => p._id.toString() !== userId.toString()
      );

      // 7. Send real-time Socket.IO notifications
      receivers.forEach((receiver) => {
        io.to(`user:${receiver._id.toString()}`).emit("capture_notification", {
          conversationId: conversationId.toString(),
          type,
          capturedBy: userId.toString(),
          eventId: captureEvent._id.toString(),
          timestamp: captureEvent.createdAt,
        });
      });

      // 8. Send push notifications (for offline users)
      receivers.forEach((receiver) => {
        sendPushNotification(receiver._id, userId, type);
      });

      // 9. Emit system message to entire conversation
      io.to(`conversation:${conversationId.toString()}`).emit(
        "chat_system_event",
        {
          conversationId: conversationId.toString(),
          type,
          text:
            type === "screenshot"
              ? "A screenshot was taken"
              : "Screen recording detected",
          timestamp: captureEvent.createdAt,
        }
      );

      console.log(
        `✅ Capture event recorded: ${type} by ${userId} in ${conversationId}`
      );
    } catch (error) {
      console.error("Error in capture_event handler:", error);
    }
  });
}