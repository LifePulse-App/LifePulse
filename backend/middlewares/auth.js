// middlewares/auth.js
import catchAsyncErrors from "../utils/catchAsyncErrors.js";
import User from "../models/UserSchema.js";
import ErrorHandler from "../utils/errorHandler.js";
import Jwt from "jsonwebtoken";

export const isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  let token;

  // // 1. Try cookies first
  // if (req.cookies && req.cookies.token) {
  //   token = req.cookies.token;
  // }
  // 2. Fallback to Authorization header (Bearer token)
 if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ErrorHandler("Login first to access this area", 401));
  }

  const decoded = Jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id);

  if (!req.user) {
    return next(new ErrorHandler("User not found", 404));
  }

  next();
});
