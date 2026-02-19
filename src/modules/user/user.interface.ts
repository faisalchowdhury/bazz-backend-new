import { Document, Types } from "mongoose";
import { TRole } from "../../config/role";

// export interface ILocation {
//   type: "Point";
//   coordinates: [number, number]; // [longitude, latitude]
// }

export interface IUser extends Document {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  password: string;
  gender: string;
  role: string;
  profilePicture: string;
  bio: string;
  isVerified: boolean;
  isDeleted: boolean;
}
export type IOTP = {
  email: string;
  otp: string;
  expiresAt: Date;
} & Document;
