import User from "../models/UserSchema.js";

// POST /api/users/keys/public
export const uploadPublicKey = async (req, res) => {
  try {
    const userId = req.user._id;
    const { publicKey } = req.body;

    if (!publicKey) {
      return res
        .status(400)
        .json({ success: false, message: "publicKey is required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { publicKey },
      { new: true, select: "name _id publicKey" }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error("UploadPublicKey Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to upload public key" });
  }
};

// GET /api/users/keys/public/:userId
export const getUserPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("name _id publicKey");

    if (!user || !user.publicKey) {
      return res.status(404).json({
        success: false,
        message: "Public key not found for this user",
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error("GetUserPublicKey Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to get public key" });
  }
};