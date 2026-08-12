// middlewares/auth.js
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import User from "../models/UserSchema.js";
import ErrorHandler from "../utils/errorHandler.js";
import { verifyUserFromToken } from "../utils/verifyJwt.js";

export const isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ErrorHandler("Unauthorized User", 401));
  }

  try {
    const decodedUser = await verifyUserFromToken(token);
    if (!decodedUser) {
      return next(new ErrorHandler("User not found", 404));
    }

    const user = await User.findById(decodedUser._id || decodedUser.id).select("accountStatus suspensionDetails role isAdmin appealDetails");
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // ⚡ EXCEPTION: If the user is trying to submit an appeal, bypass account status blocks!
    const isAppealRoute = req.originalUrl.includes('/appeal');

    if (!isAppealRoute) {
      // Enforce suspension/ban check for all other routes
      if (user.accountStatus === 'suspended') {
        if (user.suspensionDetails?.liftAt && new Date() >= new Date(user.suspensionDetails.liftAt)) {
          user.accountStatus = 'active';
          user.suspensionDetails = undefined;
          user.appealDetails = { status: 'none' };
          await user.save();
        } else {
          return res.status(403).json({
            success: false,
            accountStatus: 'suspended',
            reason: user.suspensionDetails?.reason || 'Account suspended.',
            liftAt: user.suspensionDetails?.liftAt || null,
            appealDetails: user.appealDetails,
            message: user.suspensionDetails?.liftAt 
              ? `Account suspended until ${new Date(user.suspensionDetails.liftAt).toLocaleString()}` 
              : 'Account suspended indefinitely pending review.',
          });
        }
      }

      if (user.accountStatus === 'banned') {
        return res.status(403).json({
          success: false,
          accountStatus: 'banned',
          appealDetails: user.appealDetails,
          reason: user.suspensionDetails?.reason || 'Account permanently banned.',
          message: 'Account permanently banned.',
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorHandler("Token has been expired. Try again!", 401));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new ErrorHandler("Invalid token. Please log in again.", 401));
    }
    return next(err);
  }
});

export const isAdmin = catchAsyncErrors(async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler("Unauthorized", 401));
  }
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    return next(new ErrorHandler("Access denied. Admins only.", 403));
  }
  next();
});