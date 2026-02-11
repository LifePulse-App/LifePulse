import E2EEDevice from "../models/E2EEDevice.js";
import E2EEMessage from "../models/E2EEMessage.js";
import { sendMsgNotification } from './NotificationController.js';
import mongoose from "mongoose";
import PushToken from '../models/PushToken.js';
import admin from '../firebaseAdmin.js';

// controllers/e2eeController.js
export const getThread = async (req, res) => {
  try {
    const me = req.user._id;
    const peerUserId = req.params.peerUserId;

    const deviceId = req.query.deviceId || req.query["params[deviceId]"];
    const limitRaw = req.query.limit || req.query["params[limit]"] || "200";
    const beforeRaw = req.query.before || req.query["params[before]"];

    if (!deviceId) return res.status(400).json({ message: "deviceId required" });

    const limit = Math.min(parseInt(String(limitRaw), 10), 500);
    const before = beforeRaw ? new Date(String(beforeRaw)) : null;

// outgoing self-copies for THIS device + incoming for THIS device
const query = {
  $or: [
    { fromUserId: me, toUserId: peerUserId, toDeviceId: deviceId },
    { fromUserId: peerUserId, toUserId: me, toDeviceId: deviceId },
  ],
};
    if (before) query.createdAt = { $lt: before };

    const messages = await E2EEMessage.find(query).sort({ createdAt: 1 }).limit(limit).lean();
    res.json({ messages });
  } catch (err) {
    console.error("[e2ee] getThreadForDevice error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

export const registerDevice = async (req, res) => {
  try {
    const {
      deviceId,
      signalDeviceId,
      registrationId,
      identityPub,
      signedPrekeyPub,
      signedPrekeySig,
      signedPrekeyId,
      oneTimePrekeys,
    } = req.body;

    if (
      !deviceId ||
      typeof signalDeviceId !== "number" ||
      registrationId === undefined ||
      !identityPub ||
      !signedPrekeyPub ||
      !signedPrekeySig ||
      !Array.isArray(oneTimePrekeys)
    ) {
      return res.status(400).json({ message: "Missing fields" });
    }

    await E2EEDevice.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      {
        deviceId,
        signalDeviceId,
        registrationId,
        identityPub,
        signedPrekeyPub,
        signedPrekeySig,
        signedPrekeyId,
        oneTimePrekeys,
        lastPrekeyRefresh: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("[e2ee] registerDevice error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Fetch devices by userId (for sending messages)
 */
export const getDevicesByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const devices = await E2EEDevice.find({ userId }).select(
      "-__v -createdAt -updatedAt"
    );
    res.json({ devices });
  } catch (err) {
    console.error("[e2ee] getDevicesByUser error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Fetch a device by deviceId (only for your own devices)
 */
export const getDeviceById = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const device = await E2EEDevice.findOne({
      userId: req.user._id,
      deviceId,
    }).select("-__v -createdAt -updatedAt");
    if (!device) return res.status(404).json({ message: "Device not found" });
    res.json({ device });
  } catch (err) {
    console.error("[e2ee] getDeviceById error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Top up one-time prekeys for a device
 */
export const topupPrekeys = async (req, res) => {
  try {
    const { deviceId, oneTimePrekeys } = req.body;
    if (!deviceId || !Array.isArray(oneTimePrekeys)) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const device = await E2EEDevice.findOne({
      userId: req.user._id,
      deviceId,
    });
    if (!device) return res.status(404).json({ message: "Device not found" });

    device.oneTimePrekeys = oneTimePrekeys;
    device.lastPrekeyRefresh = new Date();
    await device.save();

    res.json({ success: true });
  } catch (err) {
    console.error("[e2ee] topupPrekeys error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Store encrypted messages
 */
export const storeMessage = async (req, res) => {
  try {
    const {
      toUserId,
      toDeviceId,
      targetDeviceIds,
      fromDeviceId,
      fromSignalDeviceId,
      sessionId,
      header,
      ciphertext,
    } = req.body;

    if (
      !toUserId ||
      !fromDeviceId ||
      typeof fromSignalDeviceId !== "number" ||
      !sessionId ||
      !header ||
      !ciphertext
    ) {
      return res.status(400).json({ message: "Missing fields" });
    }

    let deviceIds = [];
    if (toDeviceId) deviceIds = [toDeviceId];
    else if (Array.isArray(targetDeviceIds) && targetDeviceIds.length) deviceIds = targetDeviceIds;
    else {
      const devices = await E2EEDevice.find({ userId: toUserId }).select("deviceId");
      deviceIds = devices.map((d) => d.deviceId);
    }

    if (!deviceIds.length) {
      return res.status(400).json({ message: "No target devices found for recipient" });
    }

    const { toDeviceOwnerUserId } = req.body;
    const prekeyOwnerUserId = toDeviceOwnerUserId || toUserId;
    
    // consume OTPK from the ACTUAL owner of target deviceIds
    if (header?.t === "prekey" && header?.preKeyId) {
      await E2EEDevice.updateMany(
        { userId: prekeyOwnerUserId, deviceId: { $in: deviceIds } },
        { $pull: { oneTimePrekeys: { keyId: header.preKeyId } } }
      );
    }

    const messages = deviceIds.map((id) => ({
      toUserId,
      toDeviceId: id,
      fromUserId: req.user._id,
      fromDeviceId,
      fromSignalDeviceId,
      sessionId,
      header,
      ciphertext,
    }));

    const inserted = await E2EEMessage.insertMany(messages);
    // Only push if recipient is not the sender (don't notify self-messages/devices)

    if (
      String(req.user._id) !== String(toUserId) &&
      req.body.notifyUser == true // Only true for the FIRST device upload per message
    ) {
      const senderName = req.user?.name || req.user?.username || "Someone";
      await sendMsgNotification(toUserId, req.user._id, senderName);
      console.log("PUSH SENT");
    }
    res.json({ success: true, count: inserted.length, ids: inserted.map((m) => m._id) });
  } catch (err) {
    console.error("[e2ee] storeMessage error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Pull undelivered messages for this device
 */
export const pullMessages = async (req, res) => {
  try {
    const deviceId = req.query.deviceId || req.query["params[deviceId]"];
    if (!deviceId) return res.status(400).json({ message: "deviceId required" });

    const messages = await E2EEMessage.find({
      toUserId: req.user._id,
      toDeviceId: deviceId,
      delivered: false,
    })
      .sort({ createdAt: 1 })
      .lean();

      if (messages.length) {
        await E2EEMessage.updateMany(
          { _id: { $in: messages.map((m) => m._id) } },
          { $set: { delivered: true, deliveredAt: new Date() } }
        );
      }

    res.json({ messages });
  } catch (err) {
    console.error("[e2ee] pullMessages error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

// controllers/e2eeController.js
export const getConversations = async (req, res) => {
  try {
    const me = req.user._id;

    // accept both ?deviceId=... and ?params[deviceId]=...
    const deviceId = req.query.deviceId || req.query["params[deviceId]"];
    if (!deviceId) return res.status(400).json({ message: "deviceId required" });

    const pipeline = [
      {
        $match: {
          $or: [
            // incoming decryptable on this device
            { toUserId: me, toDeviceId: deviceId },

            // outgoing self-copies decryptable on this device
            { fromUserId: me, toDeviceId: deviceId },
          ],
        },
      },
      { $sort: { createdAt: -1 } },

      // compute peerId per message
      {
        $addFields: {
          peerUserId: {
            $cond: [{ $eq: ["$fromUserId", me] }, "$toUserId", "$fromUserId"],
          },
        },
      },

      // take latest message per peer
      {
        $group: {
          _id: "$peerUserId",
          lastMessage: { $first: "$$ROOT" },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ];

    const results = await E2EEMessage.aggregate(pipeline);
    res.json({ conversations: results });
  } catch (err) {
    console.error("[e2ee] getConversations error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

// helper function
async function sendSeenNotification(toUserId, peerUserId) {
  const tokens = await PushToken.find({ userId: toUserId, platform: 'android' }).lean();
  for (const t of tokens) {
    await admin.messaging().send({
      token: t.token,
      data: payload,
      notification: {
        title: 'New Message',
        body: 'You received a new message',
      },
      android: { priority: 'high' },
    });
  }
}

// mark as read controller:
export const markMessagesAsRead = async (req, res) => {
  try {
    const myUserId = req.user._id;
    const { peerUserId } = req.body;
    if (!peerUserId) return res.status(400).json({ message: "peerUserId required" });

    const now = new Date();
    const updated = await E2EEMessage.updateMany(
      {
        fromUserId: peerUserId,
        toUserId: myUserId,
        seenAt: { $exists: false },
      },
      { $set: { seenAt: now } }
    );

    // Notify sender (peer) that their messages have been read
    await sendSeenNotification(peerUserId, myUserId);

    res.json({ success: true, count: updated.nModified ?? updated.modifiedCount });
  } catch (err) {
    console.error("[e2ee] markMessagesAsRead error", err);
    res.status(500).json({ message: "Internal error" });
  }
};
