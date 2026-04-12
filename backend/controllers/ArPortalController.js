import ArPortalSpot from "../models/ArPortalSpot.js";
import ArPortalMessage from "../models/ArPortalMessage.js";

/* =========================
   DISTANCE
========================= */
const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/* =========================
   DISTANCE SMOOTHING
========================= */
const lastDistances = new Map();

const smoothDistance = (spotId, newDistance) => {
  const prev = lastDistances.get(spotId);
  if (prev === undefined) {
    lastDistances.set(spotId, newDistance);
    return newDistance;
  }
  const smoothed = 0.7 * prev + 0.3 * newDistance;
  lastDistances.set(spotId, smoothed);
  return smoothed;
};

/* =========================
   ANGLE HELPERS
========================= */
const normalizeDeg = (d) => ((Number(d) % 360) + 360) % 360;
const angularDiff = (a, b) => {
  const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return Math.min(diff, 360 - diff);
};

/* =========================
   CREATE SPOT
========================= */
export const createSpot = async (req, res) => {
  try {
    const me = req.user._id;
    const { name, geo, anchor, heading } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "name is required" });
    }

    if (geo?.lat === undefined || geo?.lon === undefined) {
      return res.status(400).json({ message: "geo.lat and geo.lon are required" });
    }

    const cloudAnchorId = anchor?.cloudAnchorId ? String(anchor.cloudAnchorId) : null;

    const normalizedHeading = Number.isFinite(Number(heading))
      ? normalizeDeg(Number(heading))
      : 0;

    const spot = await ArPortalSpot.create({
      name: String(name).trim(),
      createdBy: me,
      geo: {
        lat: Number(geo.lat),
        lon: Number(geo.lon),
      },
      // store fixed spot-facing direction
      bearingDeg: normalizedHeading,
      radiusMeters: 25,
      ...(cloudAnchorId && {
        anchor: { type: "arcore_cloud", cloudAnchorId },
      }),
    });

    res.status(201).json({ success: true, spot });
  } catch (e) {
    console.error("[ar-spot] createSpot", e);
    res.status(500).json({ message: "Failed to create spot" });
  }
};

/* =========================
   LIST NEARBY SPOTS (25m + DEGREE)
========================= */
export const listNearbySpots = async (req, res) => {
  try {
    const lat = req.query.lat ?? req.query["params[lat]"];
    const lon = req.query.lon ?? req.query["params[lon]"];

    const heading = req.query.heading ?? req.query["params[heading]"];
    const headingToleranceRaw =
      req.query.headingTolerance ??
      req.query["params[headingTolerance]"] ??
      100; // less strict, more stable

    const headingTolerance = Math.min(Math.max(Number(headingToleranceRaw), 0), 180);

    if (!lat || !lon) {
      return res.status(400).json({ message: "lat and lon are required" });
    }

    const la = Number(lat);
    const lo = Number(lon);

    // strict 25m
    const r = 25;

    // small bounding box from radius
    const latDelta = r / 111111;
    const lonDelta = r / (111111 * Math.cos((la * Math.PI) / 180));

    const candidates = await ArPortalSpot.find({
      isActive: true,
      "geo.lat": { $gte: la - latDelta, $lte: la + latDelta },
      "geo.lon": { $gte: lo - lonDelta, $lte: lo + lonDelta },
    })
      .select("_id name geo radiusMeters anchor bearingDeg createdBy")
      .lean();

    const spots = candidates
      .map((s) => {
        const rawDistance = distanceMeters(la, lo, s.geo.lat, s.geo.lon);
        const smoothed = smoothDistance(s._id.toString(), rawDistance);

        return {
          ...s,
          distanceMeters: smoothed,
        };
      })
      // distance rule
      .filter((s) => s.distanceMeters <= r)
      // degree rule based on STORED spot bearing (stable)
      .filter((s) => {
        if (heading === undefined || heading === null || heading === "") return true;
        if (!Number.isFinite(Number(s.bearingDeg))) return true;

        // console.log( s.distanceMeters );
        // console.log(Number(heading))
        // console.log(Number(s.bearingDeg))
        // console.log(angularDiff(Number(heading), Number(s.bearingDeg)));

        return angularDiff(Number(heading), Number(s.bearingDeg)) <= headingTolerance;
        
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 50);
      

    res.json({ spots });
  } catch (e) {
    console.error("[ar-spot] listNearbySpots", e);
    res.status(500).json({ message: "Failed to list nearby spots" });
  }
};

/* =========================
   GET MESSAGES
========================= */
export const getSpotMessages = async (req, res) => {
  try {
    const { spotId } = req.params;

    const messages = await ArPortalMessage.find({
      spotId,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate("senderId", "username name avatar")
      .populate("reactions.userId", "username name avatar")
      .lean();

    res.json({ messages });
  } catch (e) {
    console.error("[ar-spot] getSpotMessages", e);
    res.status(500).json({ message: "Failed to get spot messages" });
  }
};

/* =========================
   POST MESSAGE
========================= */
export const postSpotMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const { spotId } = req.params;
    const { text, media, messageType = "text", anchor } = req.body;

    if (!text && !media?.url) {
      return res.status(400).json({ message: "Message content required" });
    }

    const cloudAnchorId = anchor?.cloudAnchorId ? String(anchor.cloudAnchorId) : null;

    const msg = await ArPortalMessage.create({
      spotId,
      senderId: me,
      text: String(text || "").trim(),
      media,
      messageType,
      ...(cloudAnchorId && {
        anchor: { type: "arcore_cloud", cloudAnchorId },
      }),
    });

    req.io?.to("ar-global-portal").emit("ar-spot-message", {
      spotId: String(spotId),
      message: msg,
    });

    res.status(201).json({ success: true, message: msg });
  } catch (e) {
    console.error("[ar-spot] postSpotMessage", e);
    res.status(500).json({ message: "Failed to post spot message" });
  }
};

/* =========================
   REACT TO MESSAGE
========================= */
export const reactToArMessage = async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    const userId = req.user._id;

    const msg = await ArPortalMessage.findById(messageId);
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    msg.reactions = msg.reactions.filter((r) => String(r.userId) !== String(userId));
    msg.reactions.push({
      userId,
      emoji,
      reactedAt: new Date(),
    });

    await msg.save();

    req.io?.to("ar-global-portal").emit("ar-message-reacted", {
      messageId,
      userId,
      emoji,
    });

    res.json({ success: true, reactions: msg.reactions });
  } catch (e) {
    console.error("[ar-portal] reactToArMessage", e);
    res.status(500).json({ message: "Failed to react" });
  }
};

/* =========================
   DELETE SPOT
========================= */
export const deleteSpot = async (req, res) => {
  try {
    const me = req.user._id;
    const { spotId } = req.params;

    const spot = await ArPortalSpot.findById(spotId);
    if (!spot) {
      return res.status(404).json({ message: "Spot not found" });
    }

    if (String(spot.createdBy) !== String(me)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    spot.isActive = false;
    await spot.save();

    await ArPortalMessage.updateMany(
      { spotId },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    req.io?.to("ar-global-portal").emit("ar-spot-deleted", {
      spotId: String(spotId),
    });

    res.json({ success: true });
  } catch (e) {
    console.error("[ar-spot] deleteSpot", e);
    res.status(500).json({ message: "Failed to delete spot" });
  }
};

/* =========================
   DELETE MESSAGE
========================= */
export const deleteMessage = async (req, res) => {
  try {
    const me = req.user._id;
    const { messageId } = req.params;

    const msg = await ArPortalMessage.findById(messageId);
    if (!msg) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (String(msg.senderId) !== String(me)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    msg.isDeleted = true;
    msg.deletedAt = new Date();
    msg.text = "";
    msg.media = undefined;
    msg.messageType = "text";
    msg.reactions = [];

    await msg.save();

    req.io?.to("ar-global-portal").emit("ar-message-deleted", {
      messageId: String(messageId),
    });

    res.json({ success: true });
  } catch (e) {
    console.error("[ar-spot] deleteMessage", e);
    res.status(500).json({ message: "Failed to delete message" });
  }
};