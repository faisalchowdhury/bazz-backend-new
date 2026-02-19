import { UserController } from "../user/user.controller";
import mongoose, { Schema } from "mongoose";
import { IUser, IOTP } from "./user.interface";
import { ERole } from "../../config/role";
import { string } from "zod";

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    dateOfBirth: { type: String, required: false },
    password: { type: String, required: true },
    gender: {
      type: String,
      enum: ["male", "female", "not_prefer_to_say"],
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user", "trainer"],
      default: "user",
    },
    profilePicture: { type: String },
    bio: { type: String, required: false },
    isVerified: { type: Boolean, required: true, default: false },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

// UserSchema.index({ location: "2dsphere" });
// // Pre-save hook to automatically update location from lat/lng
// UserSchema.pre("save", function (next) {
//   const lat = this.latitude || 23.746489;
//   const lng = this.longitude || 90.372348;

//   if (lat < -90 || lat > 90)
//     return next(new Error("Latitude must be between -90 and 90"));
//   if (lng < -180 || lng > 180)
//     return next(new Error("Longitude must be between -180 and 180"));

//   this.location = { type: "Point", coordinates: [lng, lat] };
//   next();
// });

export const UserModel = mongoose.model<IUser>("User", userSchema);

// userSchema.index({ name: "text" });
// UserSchema.index({ createdAt: 1 });
// UserModel.schema.index({ role: 1 });

const OTPSchema = new Schema<IOTP>({
  email: { type: String, required: true, trim: true, index: true },
  otp: { type: String, required: true, trim: true },
  expiresAt: { type: Date, required: true, index: { expires: "1m" } },
});

export const OTPModel = mongoose.model<IOTP>("OTP", OTPSchema);
OTPSchema.index({ email: 1, expiresAt: 1 });
