import mongoose from "mongoose";
import Jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const streakSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: null },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
      maxLength: [25, "Your name cannot exceed 25 characters"],
    },
    username: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^\+?[0-9]{10,15}$/, "Please enter a valid phone number"],
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
      validate: {
        validator: function (value) {
          // Regex: at least 1 uppercase, 1 lowercase, 1 number, 1 special char
          return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
            value
          );
        },
        message:
          "Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character",
      },
    },
    role: {
      type: String,
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    currentTitle: {
      type: String,
    },
    xp: { type: Number, default: 0 },
    streak: { type: streakSchema, default: () => ({}) },
    deviceInfo: [
      {
        deviceName: { type: String },
        deviceBrand: { type: String }, 
        deviceModel: { type: String },
      },
    ],
    verificationCode: String,
    verificationCodeExpire: Date,
    refreshTokens: [
      {
        token: { type: String, required: true },
        deviceId: { type: String }, // store device name here
        expiresAt: { type: Date, required: true },
      },
    ],
    
    avatar: {
      public_id: String,
      url: String,
    },
    providers: [
      {
        provider: { type: String, enum: ["google", "apple"] },
        providerId: { type: String },
        deviceId: { type: String },
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  
  { timestamps: true }
);

// 🔒 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// 🔑 JWT Token
userSchema.methods.getJwtToken = function () {
  return Jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.methods.getRefreshToken = function (uniqueId) {
    const token = Jwt.sign({ id: this._id, deviceId: uniqueId }, process.env.REFRESH_SECRET, {
      expiresIn: "60d",
    });

      // Remove any old token for this device
  this.refreshTokens = this.refreshTokens.filter(
    (t) => t.device !== deviceId
  );
  
    this.refreshTokens.push({
      token,
      device: deviceId,
      expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days
    });
  
    this.save({ validateBeforeSave: false });
    return token;
  };
  

// 🔑 Password reset token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");

  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

// 🔑 Compare hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false; // SSO user has no password
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔹 Generate OTP
userSchema.methods.generateVerificationCode = function () {
  // simple 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // hash OTP before saving (for security)
  this.verificationCode = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  this.verificationCodeExpire = Date.now() + 5 * 60 * 1000; 

  return otp; // return plain OTP so we can email it
};

// 🔹 Verify OTP
userSchema.methods.verifyOtp = async function (enteredOtp) {
  const hashedOtp = crypto.createHash("sha256").update(enteredOtp).digest("hex");

  return (
    this.verificationCode === hashedOtp &&
    this.verificationCodeExpire > Date.now()
  );
};

export default mongoose.model("User", userSchema);
