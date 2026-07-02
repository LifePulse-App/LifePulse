import Call from "../models/Call.js";

/**
 * GET /api/calls/history
 */
export const getCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const calls = await Call.find({
      $or: [
        { caller: userId },
        { receiver: userId },
      ],
    })
      .populate("caller", "name username avatar")
      .populate("receiver", "name username avatar")
      .populate("conversationId")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      calls,
    });
  } catch (err) {
    console.error("getCallHistory", err);

    return res.status(500).json({
      success: false,
      message: "Failed to load call history",
    });
  }
};

/**
 * GET /api/calls/:id
 */
export const getCallDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const call = await Call.findById(id)
      .populate("caller", "name username avatar")
      .populate("receiver", "name username avatar")
      .populate("conversationId");

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    const allowed =
      call.caller._id.equals(userId) ||
      call.receiver._id.equals(userId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.json({
      success: true,
      call,
    });
  } catch (err) {
    console.error("getCallDetails", err);

    return res.status(500).json({
      success: false,
      message: "Failed to load call",
    });
  }
};

/**
 * DELETE /api/calls/:id
 * Deletes call log only
 */
export const deleteCall = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const call = await Call.findById(id);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    const allowed =
      call.caller.equals(userId) ||
      call.receiver.equals(userId);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    await call.deleteOne();

    return res.json({
      success: true,
      message: "Call deleted",
    });
  } catch (err) {
    console.error("deleteCall", err);

    return res.status(500).json({
      success: false,
      message: "Failed to delete call",
    });
  }
};

/**
 * DELETE /api/calls/history
 * Delete all history of current user
 */
export const clearCallHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    await Call.deleteMany({
      $or: [
        { caller: userId },
        { receiver: userId },
      ],
    });

    return res.json({
      success: true,
      message: "History cleared",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Failed to clear history",
    });
  }
};