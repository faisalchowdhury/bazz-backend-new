import { IUser } from "./user.interface";
import "dotenv/config";

import { Twilio } from "twilio";

import { OTPModel, UserModel } from "./user.model";
import crypto from "crypto";
import ApiError from "../../errors/ApiError";

import { findUserByEmail, generateOTP, hashPassword } from "./user.utils";

import httpStatus from "http-status";
import { generateToken, verifyToken } from "../../utils/JwtToken";

import { TRole } from "../../config/role";
import paginationBuilder from "../../utils/paginationBuilder";
import mongoose, { Types } from "mongoose";
import {
  twilioAccountSid,
  twilioAuthToken,
  twilioPhoneNumber,
} from "../../config";

import { JwtPayloadWithUser } from "../../middlewares/userVerification";

export const registerUserService = async (data: any) => {
  const { firstName, lastName, email, dateOfBirth, password, gender, bio } =
    data.body;

  console.log(data.body);
  const start = Date.now();
  const session = await mongoose.startSession();
  // Check if user already exists
  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    throw new ApiError(400, "User already exist");
  }
  const hashedPassword = await hashPassword(password);

  const userPayload: any = {
    firstName,
    lastName,
    email,
    dateOfBirth,
    gender,
    password: hashedPassword,
    bio,
    isVerified: false,
  };

  if (data.file) {
    userPayload.profilePicture = `/images/${data.file.filename}`;
  }
  // Create new user
  const newUser = await UserModel.create(userPayload);

  // Generate and store OTP (optional if you’re using OTP verification)
  const otp = Math.floor(100000 + Math.random() * 900000);
  await OTPModel.create({
    email,
    otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
  });

  console.log(`OTP generated for ${email}: ${otp}`);

  const end = Date.now();
  console.log(`Registration process took ${end - start}ms`);

  //  Keep the return identical to your previous version
  return {
    success: true,
    statusCode: 200,
    message: "User registered successfully. Please verify your email address.",
    data: {
      user: newUser,
      otp,
    },
  };
};

/**
 * Creates a new user in the database.
 */

const createUser = async ({
  name,
  hashedPassword,
  phone,
  longitude,
  latitude,
  image,
  fcmToken,
  role,
  touchId,
  faceId,
}: {
  name: string;
  hashedPassword: string | null;
  phone: number;
  longitude: number;
  latitude: number;
  image: string;
  fcmToken: string;
  role: TRole;
  touchId?: string;
  faceId?: string;
}): Promise<{ createdUser: IUser }> => {
  try {
    const createdUser = await UserModel.create({
      name,
      password: hashedPassword,
      phone,
      longitude,
      latitude,
      image,
      fcmToken,
      role,
      touchId,
      faceId,
    });

    return { createdUser };
  } catch (error) {
    console.error("User creation failed:", error);
    throw new ApiError(500, "User creation failed");
  }
};

/**
 * Updates a user by ID.
 */
const updateUserById = async (
  id: string,
  updateData: Partial<IUser>,
): Promise<IUser | null> => {
  return UserModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  );
};

/**
 * Soft-deletes a user and anonymizes their email.
 */
const userDelete = async (id: string, email: string): Promise<void> => {
  const baseDeletedEmail = `deleted-account-${email}`;
  let deletedEmail = baseDeletedEmail;
  for (
    let counter = 1;
    await UserModel.exists({ email: deletedEmail });
    counter++
  ) {
    deletedEmail = `${baseDeletedEmail}-${counter}`;
  }
  await UserModel.findByIdAndUpdate(id, {
    isDeleted: true,
    email: deletedEmail,
  });
};

/**
 * Verifies OTP for forgot password flow and returns a new token if valid.
 */
const verifyForgotPasswordOTPService = async (email: string, otp: string) => {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }
  const otpRecord = await OTPModel.findOne({ email });
  if (!otpRecord) {
    throw new ApiError(httpStatus.NOT_FOUND, "OTP record not found!");
  }
  const currentTime = new Date();
  if (otpRecord.expiresAt < currentTime) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP has expired");
  }
  if (otpRecord.otp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Wrong OTP");
  }
  const userId = user._id as string;
  const token = generateToken({
    id: userId,
    role: user.role,
    email: user.email,
  });
  return { token };
};

/**
 * Gets a paginated list of admin users.
 */
const getAdminList = async (
  skip: number,
  limit: number,
  name?: string,
): Promise<{
  admins: IUser[];
  pagination: ReturnType<typeof paginationBuilder>;
}> => {
  const query: any = {
    isDeleted: { $ne: true },
    role: { $in: ["primary", "secondary", "junior"] },
  };
  if (name) {
    query.name = { $regex: name, $options: "i" };
  }
  const pipeline: any[] = [
    { $match: query },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        image: 1,
        name: 1,
        role: 1,
        email: 1,
        createdAt: 1,
        phone: 1,
        address: 1,
        _id: 1,
      },
    },
  ];
  const admins = await UserModel.aggregate(pipeline);
  const totalAdmins = await UserModel.countDocuments(query);
  const currentPage = Math.floor(skip / limit) + 1;
  const pagination = paginationBuilder({
    totalData: totalAdmins,
    currentPage,
    limit,
  });
  return { admins, pagination };
};

/**
 * Gets a paginated list of non-admin users with optional filters.
 */
const getUserList = async (
  skip: number,
  limit: number,
  date?: string,
  name?: string,
  email?: string,
  role?: string,
  requestStatus?: string,
): Promise<{
  users: IUser[];
  pagination: ReturnType<typeof paginationBuilder>;
}> => {
  const query: any = {
    $and: [{ isDeleted: { $ne: true } }, { role: { $nin: ["admin"] } }],
  };
  if (date) {
    const [year, month, day] = date.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    query.createdAt = { $gte: startDate, $lte: endDate };
  }
  if (name) query.name = { $regex: name, $options: "i" };
  if (role) query.role = { $regex: role, $options: "i" };
  if (requestStatus) {
    query.isRequest = { $regex: requestStatus, $options: "i" };
  }
  const pipeline: any[] = [
    { $match: query },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $project: {
        image: 1,
        name: 1,
        email: 1,
        role: 1,
        createdAt: 1,
        phone: 1,
        address: 1,
        isRequest: 1,
        managerInfoId: 1,
        _id: 1,
      },
    },
  ];
  const users = (await UserModel.aggregate(pipeline)) as IUser[];
  const totalUsers = await UserModel.countDocuments(query);
  const currentPage = Math.floor(skip / limit) + 1;
  const pagination = paginationBuilder({
    totalData: totalUsers,
    currentPage,
    limit,
  });
  return { users, pagination };
};

const verifyOTPService = async (otp: string, authorizationHeader: string) => {
  let decoded: JwtPayloadWithUser;

  try {
    decoded = verifyToken(authorizationHeader) as JwtPayloadWithUser;

    console.log(decoded);
  } catch (error: any) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token");
  }

  const email = decoded.email as string;

  const dbOTP = await OTPModel.findOne({ email });
  if (!dbOTP || dbOTP.otp !== otp) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP");
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found!");
  }

  const token = generateToken({
    id: user._id,
    role: user.role,
    email: user.email,
  });

  return {
    token,
    name: user.name,
    email: user.email,
  };
};

// OTP Verification

// Ensure config is properly typed
interface Config {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
}

const client = new Twilio(twilioAccountSid, twilioAuthToken);

const sendSMS = async (to: string, body: string): Promise<void> => {
  try {
    await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
    });
    // logger.info(`SMS sent to ${to}`);
  } catch (error: any) {
    console.log(`Failed to send SMS to ${to}: ${error.message}`);
    throw error;
  }
};

const sendPhoneVerification = async (
  to: string,
  otp: string,
): Promise<void> => {
  try {
    const message = `Your verification code is ${otp}`;
    await sendSMS(to, message);
  } catch (err) {
    console.log(err);
  }
};

const sendResetPasswordSMS = async (to: string, otp: number): Promise<void> => {
  const message = `Your password reset code is ${otp}`;
  await sendSMS(to, message);
};

const UserService = {
  registerUserService,
  createUser,
  updateUserById,
  userDelete,
  verifyForgotPasswordOTPService,
  getAdminList,
  getUserList,
  verifyOTPService,
  sendPhoneVerification,
  sendResetPasswordSMS,
  sendSMS,
};

export { UserService };
