import E2EEDevice from "../models/E2EEDevice.js";
import E2EEMessage from "../models/E2EEMessage.js";

/**
 * Register or update a device bundle
 */
export const registerDevice = async (req, res) => {
  try {
    const {
      deviceId,
      registrationId,
      identityPub,
      signedPrekeyPub,
      signedPrekeySig,
      signedPrekeyId,
      oneTimePrekeys,
    } = req.body;

    if (
      !deviceId ||
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
 * Fetch devices by userId (for sending) or by deviceId (for your own device)
 */
export const getDevicesByUser = async (req, res) => {
  try {
    const { userId } = req.params.userId;
    const devices = await E2EEDevice.find({ userId }).select("-__v -createdAt -updatedAt");
    res.json({ devices });
  } catch (err) {
    console.error("[e2ee] getDevicesByUser error", err);
    res.status(500).json({ message: "Internal error" });
  }
};

export const getDeviceById = async (req, res) => {
  try {
    const { deviceId } = req.params.deviceId;
    const device = await E2EEDevice.findOne({ userId: req.user._id, deviceId }).select(
      "-__v -createdAt -updatedAt"
    );
    if (!device) return res.status(404).json({ message: "Device not found" });
    res.json({ device });
  } catch (err) {
    console.error("[e2ee] getDeviceById error", err);
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
 * Store encrypted message.
 * If toDeviceId is provided -> store single.
 * If targetDeviceIds is provided -> fan-out to those.
 * If neither is provided -> fan-out to all receiver devices.
 */
export const storeMessage = async (req, res) => {
  try {
    const {
      toUserId,
      toDeviceId,          // optional single target
      targetDeviceIds,     // optional array of deviceIds
      fromDeviceId,
      sessionId,
      header,
      ciphertext,
    } = req.body;

    if (!toUserId || !fromDeviceId || !sessionId || !header || !ciphertext) {
      return res.status(400).json({ message: "Missing fields" });
    }

    let deviceIds = [];

    if (toDeviceId) {
      deviceIds = [toDeviceId];
    } else if (Array.isArray(targetDeviceIds) && targetDeviceIds.length) {
      deviceIds = targetDeviceIds;
    } else {
      // Fan-out to all devices of the recipient
      const devices = await E2EEDevice.find({ userId: toUserId }).select("deviceId");
      deviceIds = devices.map((d) => d.deviceId);
    }

    if (!deviceIds.length) {
      return res.status(400).json({ message: "No target devices found for recipient" });
    }

    const docs = deviceIds.map((devId) => ({
      toUserId,
      toDeviceId: devId,
      fromUserId: req.user._id,
      fromDeviceId,
      sessionId,
      header,
      ciphertext,
    }));

    const inserted = await E2EEMessage.insertMany(docs);
    res.json({ success: true, count: inserted.length, ids: inserted.map((d) => d._id) });
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
    const deviceId = req.query.deviceId || req.query["params[deviceId]"];
    if (!deviceId) return res.status(400).json({ message: "deviceId required" });

    const msgs = await E2EEMessage.find({
      toUserId: req.user._id,
      toDeviceId: deviceId,
      delivered: false,
    })
      .sort({ createdAt: 1 })
      .lean();

    if (msgs.length) {
      await E2EEMessage.updateMany(
        { _id: { $in: msgs.map((m) => m._id) } },
        { $set: { delivered: true } }
      );
    }

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
              $cond: [{ $eq: ["$toUserId", req.user._id] }, "$fromUserId", "$toUserId"],
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