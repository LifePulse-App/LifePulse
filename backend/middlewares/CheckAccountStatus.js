import User from "../models/UserSchema.js";

export const checkAccountStatus = async (req, res, next) => {
  if (!req.user || !req.user._id) {
    return next();
  }

  try {
    // Fetch the freshest account status from the database
    const user = await User.findById(req.user._id).select("accountStatus suspensionDetails");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.accountStatus === 'suspended') {
      // ⚡ Check if a temporary suspension timer was set and has now expired
      if (user.suspensionDetails?.liftAt && new Date() >= new Date(user.suspensionDetails.liftAt)) {
        // Timer expired! Automatically lift the suspension
        user.accountStatus = 'active';
        user.suspensionDetails = undefined;
        user.appealDetails = { status: 'none' };
        await user.save();
        return next(); // Let them pass through
      }

      // Still suspended
      return res.status(403).json({
        success: false,
        accountStatus: 'suspended',
        liftAt: user.suspensionDetails?.liftAt || null,
        message: user.suspensionDetails?.liftAt 
          ? `Account suspended until ${new Date(user.suspensionDetails.liftAt).toLocaleString()}` 
          : 'Account suspended indefinitely pending review.',
      });
    }

    if (user.accountStatus === 'banned') {
      return res.status(403).json({
        success: false,
        accountStatus: 'banned',
        message: 'Account permanently banned.',
      });
    }

    // Account is active, proceed normally
    next();
  } catch (err) {
    console.error("[checkAccountStatus middleware error]", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};