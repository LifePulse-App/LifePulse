import E2EEDevice from "../models/E2EEDevice.js";
import E2EEMessage from "../models/E2EEMessage.js";

/**
 * Register or update a device bundle (public keys only)
 */
export const registerDevice = async (req, res) => {
  try {
    const { deviceId, identityPub, signedPrekeyPub, signedPrekeySig, oneTimePrekeys } = req.body;
    if (!deviceId || !identityPub || !signedPrekeyPub || !signedPrekeySig || !Array.isArray(oneTimePrekeys)) {
      return res.status(400).json({ message: "Missing fields" });
    }

    await E2EEDevice.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      { identityPub, signedPrekeyPub, signedPrekeySig, oneTimePrekeys, lastPrekeyRefresh: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("[e2ee] registerDevice error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Fetch all device bundles for a user (for multi-device fan-out)
 */
export const getDevices = async (req, res) => {
  try {
    const devices = await E2EEDevice.find({ userId: req.params.userId }).select("-__v -createdAt -updatedAt");
    res.json({ devices });
  } catch (err) {
    console.error("[e2ee] getDevices error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Top up one-time prekeys
 */
export const topupPrekeys = async (req, res) => {
  try {
    const { deviceId, oneTimePrekeys } = req.body;
    if (!deviceId || !Array.isArray(oneTimePrekeys)) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const doc = await E2EEDevice.findOne({ userId: req.user._id, deviceId });
    if (!doc) return res.status(404).json({ message: "Device not found" });

    doc.oneTimePrekeys = oneTimePrekeys;
    doc.lastPrekeyRefresh = new Date();
    await doc.save();
    res.json({ success: true });
  } catch (err) {
    console.error("[e2ee] topupPrekeys error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Store encrypted message
 */
export const storeMessage = async (req, res) => {
  try {
    const { toUserId, toDeviceId, fromDeviceId, sessionId, header, ciphertext } = req.body;
    if (!toUserId || !toDeviceId || !fromDeviceId || !sessionId || !header || !ciphertext) {
      return res.status(400).json({ message: "Missing fields" });
    }
    await E2EEMessage.create({
      toUserId,
      toDeviceId,
      fromUserId: req.user._id,
      fromDeviceId,
      sessionId,
      header,
      ciphertext,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[e2ee] storeMessage error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Fetch undelivered messages for this user/device
 */
export const pullMessages = async (req, res) => {
  try {
    console.log(req.params);
    const { deviceId } = req.query;
    if (!deviceId) return res.status(400).json({ message: "deviceId required" });

    const msgs = await E2EEMessage.find({
      toUserId: req.user._id,
      toDeviceId: deviceId,
      delivered: false,
    })
      .sort({ createdAt: 1 })
      .lean();

    await E2EEMessage.updateMany({ _id: { $in: msgs.map((m) => m._id) } }, { $set: { delivered: true } });

    res.json({ messages: msgs });
  } catch (err) {
    console.error("[e2ee] pullMessages error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

/**
 * Conversation list (last message per peer user)
 */
export const getConversations = async (req, res) => {
  try {
    const pipeline = [
      { $match: { $or: [{ toUserId: req.user._id }, { fromUserId: req.user._id }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            peer: {
              $cond: [
                { $eq: ["$toUserId", req.user._id] },
                "$fromUserId",
                "$toUserId",
              ],
            },
          },
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