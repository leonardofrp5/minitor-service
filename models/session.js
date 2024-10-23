import { Schema, model } from "mongoose";

export const SessionSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  phoneNumber: { type: String, required: true },
  emergencyPhoneNumber: { type: String, required: true },
  countryCode: { type: String, required: true, default: '+57' },
  scheduledTime: { type: Date, required: true },
  verificationAttemps: { type: Array, require: false }
}, {
  timestamps: true,
});

export const SessionModel = model("Session", SessionSchema);