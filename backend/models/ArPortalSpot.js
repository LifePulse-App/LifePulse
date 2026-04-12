import mongoose from "mongoose";

const arPortalSpotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 20 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    geo: {
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },

    radiusMeters: { type: Number, default: 25 },
    isActive: { type: Boolean, default: true },

    // fixed spot direction at creation time (0..359)
    bearingDeg: { type: Number, default: 0 },

    anchor: {
      type: {
        type: String,
        enum: ["arcore_cloud"],
        default: "arcore_cloud",
      },
      cloudAnchorId: { type: String, required: false },
    },
  },
  { timestamps: true }
);

arPortalSpotSchema.index({ "geo.lat": 1, "geo.lon": 1 });

export default mongoose.model("ArPortalSpot", arPortalSpotSchema);