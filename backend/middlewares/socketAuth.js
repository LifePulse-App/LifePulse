import User from "../models/UserSchema.js";
import { verifyUserFromToken } from "../utils/verifyJwt.js";

export default async function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    // 1. Verify token signature
    const decodedUser = await verifyUserFromToken(token);
    if (!decodedUser) {
      return next(new Error("Unauthorized"));
    }

    // 2. Fetch fresh user data from DB to check live account status
    const user = await User.findById(decodedUser._id || decodedUser.id).select(
      "name username email accountStatus suspensionDetails"
    );

    if (!user) {
      return next(new Error("User not found"));
    }

    // 3. ⚡ Enforce suspension/ban check
    if (user.accountStatus === 'suspended') {
      if (user.suspensionDetails?.liftAt && new Date() >= new Date(user.suspensionDetails.liftAt)) {
        // Timer expired! Automatically lift the suspension
        user.accountStatus = 'active';
        user.suspensionDetails = undefined;
        user.appealDetails = { status: 'none' };
        await user.save();
      } else {
        // Still suspended - reject socket connection
        return next(new Error("Account suspended"));
      }
    }

    if (user.accountStatus === 'banned') {
      // Banned - reject socket connection
      return next(new Error("Account banned"));
    }

    // 4. Attach verified & active user to socket instance
    socket.user = user;
    socket.userId = user._id.toString();

    next();
  } catch (err) {
    console.error("Socket Auth Error:", err.message);
    next(new Error("Unauthorized"));
  }
}