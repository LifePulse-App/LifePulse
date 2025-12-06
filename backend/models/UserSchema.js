import mongoose from "mongoose";
import Jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const streakSchema = new mongoose.Schema({
  count: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: null },
});

const deviceInfoSchema = new mongoose.Schema(
  {
    deviceId: { type: String }, // unique per device
    deviceName: { type: String },
    deviceModel: { type: String },
    deviceBrand: { type: String },
    lastLogin: { type: Date, default: Date.now },
    location: {
      city: { type: String },
      country: { type: String },
      ip: { type: String },
    },
  },
  { _id: false }
);

// Notifications: pause chat/streak/Jabits reminders
const notificationSchema = new mongoose.Schema({
  push: { type: Boolean, default: true },
  pauseStreak: { type: Boolean, default: false },
  pauseChat: { type: Boolean, default: false },
  pauseJabits: { type: Boolean, default: false },
}, { _id: false });

const twoFactorSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },

    // encrypted TOTP secret
    secret: {
      iv: { type: String },
      authTag: { type: String },
      ciphertext: { type: String },
    },

    lastVerified: { type: Date },

    backupCodes: [
      {
        codeHash: { type: String, required: true },
        used: { type: Boolean, default: false },
        usedAt: { type: Date },
      },
    ],
  },
  { _id: false }
);

const avatarConfigSchema = new mongoose.Schema(
  {
    skinTone: { type: String, default: 'skin_light' }, // keys, not raw colors
    hairStyle: { type: String, default: 'hair_short_1' },
    hairColor: { type: String, default: 'hair_black' },
    eyeShape: { type: String, default: 'eye_round' },
    eyeColor: { type: String, default: 'eye_brown' },
    mouth: { type: String, default: 'mouth_smile' },
    eyebrowStyle: { type: String, default: 'brow_soft' },
    accessories: [{ type: String }], // e.g. ['glasses_round', 'hat_beanie']
    outfit: { type: String, default: 'outfit_casual_1' },
    backgroundColor: { type: String, default: '#E5E7EB' },
  },
  { _id: false },
);



const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
      maxLength: [35, "Your name cannot exceed 35 characters"],
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
    // 🔥 NEW: monthly leaderboard XP (resets each month)
    monthlyXp: { type: Number, default: 0 },

    // 🔥 NEW: lifetime XP for permanent leaderboard
    totalXp: { type: Number, default: 0 },

    // 🔥 NEW: lifetime level (you can compute from totalXp or manage separately)
    level: { type: Number, default: 1 },

    // 🔥 NEW: country / city for city/country leaderboards
    country: { type: String, default: "" },
    city: { type: String, default: "" },

    // 🔥 NEW: restrict changing country/city for 30 days
    locationLockUntil: { type: Date, default: null },

    // 🔥 NEW: monthly reward currency balance (for redemption store)
    rewardBalance: { type: Number, default: 0 },
    deviceInfo: [deviceInfoSchema], // array of devices
    notifications: notificationSchema,
    twoFactor: { type: twoFactorSchema, default: () => ({}) },
    verificationCode: String,
    verificationCodeExpire: Date,
    otpResendCount: {
      type: Number,
      default: 0,
    },
    otpResendResetAt: {
      type: Date,
    },
    // in User schema
resetPasswordVerified: {
  type: Boolean,
  default: false,
},
    refreshTokens: [
      {
        token: { type: String, required: true },
        deviceId: { type: String }, // store device name here
        expiresAt: { type: Date, required: true },
      },
    ],

    isPublic: {
      type: Boolean,
      default: false
  },
  followers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Store ObjectId inside `user`
        followedAt: { type: Date, default: Date.now }
      }
    ],
    following: [
      {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Store ObjectId inside `user`
          followedAt: { type: Date, default: Date.now }
        }
       
    ],
    followRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        requestedAt: { type: Date, default: Date.now }, // Timestamp added for follow requests
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
    publicKey: {
      type: String,
    },
    avatarConfig: {
      type: avatarConfigSchema,
      default: () => ({
        skinTone: 'skin_light',
        hairStyle: 'hair_short_1',
        hairColor: 'hair_black',
        eyeShape: 'eye_round',
        eyeColor: 'eye_brown',
        mouth: 'mouth_smile',
        eyebrowStyle: 'brow_soft',
        accessories: [],
        outfit: 'outfit_casual_1',
        backgroundColor: '#E5E7EB',
      }),
    },
    avatarUrl: {
      type: String,
      default: '',
    }, // Ready Player Me avatar URL (e.g. https://models.readyplayer.me/xxxx.glb)
    
    avatarMetadata: {
      type: Object,
      default: {},
    },
    avatarModelUrl: {
      type: String,
      default: '',
    },
    avatarThumbnailUrl: {
      type: String,
      default: '',
    },
    avatarMetadata: {
      type: Object,
      default: {},
    },
// In your User schema
resetPasswordCode: String,
resetPasswordCodeExpire: Date,
pendingEmail: { type: String },
emailChangeOtp: { type: String },
emailChangeOtpExpire: { type: Date },
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

userSchema.methods.getRefreshToken = function (deviceId) {
    const token = Jwt.sign({ id: this._id, deviceId }, process.env.REFRESH_SECRET, {
      expiresIn: "60d",
    });

      // Remove any old token for this device
  this.refreshTokens = this.refreshTokens.filter(
    (t) => t.deviceId !== deviceId
  );
  
    this.refreshTokens.push({
      token,
      deviceId,
      expiresAt: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60 days
    });
  
    this.save({ validateBeforeSave: false });
    return token;
  };
  

// 🔑 Password reset code
userSchema.methods.generateResetCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  this.resetPasswordCode = hashedCode;
  this.resetPasswordCodeExpire = Date.now() + 2 * 60 * 1000; // 15 minutes

  return code; // send this to user
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

  this.verificationCodeExpire = Date.now() + 2 * 60 * 1000; 

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
