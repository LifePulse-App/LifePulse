import Jwt from "jsonwebtoken";
import User from "../models/UserSchema.js";

export async function verifyUserFromToken(token) {
  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = Jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}