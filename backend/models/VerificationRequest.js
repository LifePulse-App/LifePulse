// models/VerificationRequest.js
import mongoose from "mongoose";

const verificationRequestSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      unique: true 
    },
    fullName: { 
      type: String, 
      required: [true, "Please enter your full legal name"] 
    },
    stageName: { 
      type: String, 
      required: [true, "Please enter your professional or stage name"] 
    },
    category: { 
      type: String, 
      enum: ["Musician", "Actor", "Athlete", "Creator", "Public Figure", "Other"], 
      required: true 
    },
    publicProfileLink: { 
      type: String, 
      required: [true, "Please provide a public link or media reference"] 
    },
    documentUrl: { 
      type: String, 
      required: [true, "Government ID document is required"] 
    },
    selfieUrl: { 
      type: String, 
      required: [true, "Verification selfie holding the reference code is required"] 
    },
    verificationCode: { 
  type: String, 
  required: true 
},
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "pending" 
    },
    adminNotes: { 
      type: String, 
      default: "" 
    },
  },
  { timestamps: true }
);

export default mongoose.model("VerificationRequest", verificationRequestSchema);