// middlewares/auth.js
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import User from "../models/UserSchema.js";
import ErrorHandler from "../utils/errorHandler.js";
import Jwt from "jsonwebtoken";
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
    req.user = await verifyUserFromToken(token);

    if (!req.user) {
      return next(new ErrorHandler("User not found", 404));
    }

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
  // Add isAdmin field to your User model if you haven't already
  // or use a role field: req.user.role === 'admin'
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    return next(new ErrorHandler("Access denied. Admins only.", 403));
  }
  next();
});
