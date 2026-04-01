import { Request, Response } from "express";

import catchAsync from "../../utils/catchAsync";
import sendError from "../../utils/sendError";
import sendResponse from "../../utils/sendResponse";

import {
  getUserMemory,
  getUserProfile,
  getUserWorkoutHistory,
  updateUserProfile,
  UserService,
} from "./user.service";
import { completeOnboarding as completeOnboardingService } from "./user.service";
import { OTPModel, UserModel } from "./user.model";

import { emitNotification } from "../../utils/socket";
import httpStatus from "http-status";
// import RegisterShowerModel from "../RegisterShower/RegisterShower.model";

import argon2 from "argon2";

import {
  findUserByEmail,
  findUserById,
  generateOTP,
  hashPassword,
  saveOTP,
  sendOTPEmailRegister,
  sendOTPEmailVerification,
} from "./user.utils";

import ApiError from "../../errors/ApiError";
import {
  generateRegisterToken,
  generateToken,
  generateTokenForAdmin,
  verifyToken,
} from "../../utils/JwtToken";

import { sendPushNotification } from "../notifications/pushNotification/pushNotification.controller";
import { IUserPayload } from "../../middlewares/roleGuard";

import { JwtPayloadWithUser } from "../../middlewares/userVerification";

import mongoose from "mongoose";
import { number } from "zod";

//  register User

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const { firstName, email, role } = req.body;

  // Step 1: Register the user and get OTP
  const { data } = await UserService.registerUserService(req);

  const { otp, user } = data; // user already created here

  const token = generateRegisterToken({ email });

  (async () => {
    try {
      // const hashedPassword = await hashPassword(password);

      // If file uploaded, update image

      // Send OTP
      // await UserService.sendPhoneVerification(email, String(otp));
      await sendOTPEmailRegister(firstName, email, String(otp));
      // Save OTP for verification
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 1000);
      await OTPModel.findOneAndUpdate({ email }, { otp, expiresAt });

      // Emit notification
      const notificationPayload = {
        userId: user._id,
        userMsgTittle: "🎉 Registration Completed",
        adminMsgTittle: "📢 New User Registration",
        userMsg: `Welcome to ${process.env.AppName}, ${user?.firstName}! 🎉`,
        adminMsg: `New user ${user?.firstName} has registered on ${process.env.AppName}.`,
      } as any;
      await emitNotification(notificationPayload);

      await saveOTP(email, String(otp));

      return sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message:
          "OTP sent to your email address. Please verify to continue registration.",
        data: { token, role },
      });
    } catch (backgroundError: any) {
      console.error("Error in background tasks:", backgroundError?.message);
      return sendResponse(res, {
        statusCode: backgroundError?.statusCode || 500,
        success: false,
        data: backgroundError?.message,
      });
    }
  })();
});

const resendOTP = catchAsync(async (req: Request, res: Response) => {
  const email = req.body.email;

  const isExist: any = await UserModel.findOne({ email });
  if (!isExist) {
    sendResponse(res, {
      statusCode: 401,
      success: false,
      message: "User not found",
      data: null,
    });
  }

  const otp = generateOTP();
  await sendOTPEmailRegister(isExist.firstName, email, String(otp));
  // await UserService.sendPhoneVerification(email, otp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 1000);
  // Save or update the OTP in the database concurrently.
  const isExistOtp = await Promise.all([
    OTPModel.findOneAndUpdate({ email }, { otp, expiresAt }, { upsert: true }),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Otp sent to this email ${email}`,
    data: "",
  });
});

export const loginUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password, fcmToken } = req.body;

  const user = await UserModel.findOne({ email });
  console.log(email);
  if (!user) {
    throw new ApiError(401, "This account does not exist.");
  }

  if (user.isDeleted) {
    throw new ApiError(404, "your account is deleted.");
  }
  // await validateUserLockStatus(user);
  const userId = user._id as string;

  const verifyToken = generateToken({
    id: userId,
    email: user.email,
    role: user.role,
  });
  if (!user.isVerified) {
    sendResponse(res, {
      statusCode: 401,
      success: false,
      message: "We've sent an OTP to your email to verify your profile.",
      data: {
        role: user.role,
        token: verifyToken,
      },
    });
    const name = user.firstName as string;
    const otp = generateOTP();
    sendOTPEmailVerification(name, email, otp)
      .then(() => {})
      .catch((err) => {
        console.error("Error sending OTP email:", err);
      });
    return await saveOTP(email, otp);
  }

  const isPasswordValid = await argon2.verify(
    user.password as string,
    password,
  );
  if (!isPasswordValid) {
    throw new ApiError(401, "Wrong password!");
  }

  const token = generateToken({
    id: userId,
    email: user.email,
    role: user.role,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Login complete!",
    data: {
      user: {
        _id: user._id,
        name: user?.firstName + " " + user?.lastName,
        email: user?.email,
        role: user?.role,
      },
      token,
    },
  });

  await user.save();
});

// //cool down timer
export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, "Please provide your email.");
    }

    // await delCache(email);
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new ApiError(401, "This account does not exist.");
    }

    const now = new Date();
    // Check if there's a pending OTP request and if the 2-minute cooldown has passed
    // const otpRecord = await OTPModel.findOne({ email });
    // if (otpRecord && otpRecord.expiresAt > now) {
    //   const remainingTime = Math.floor(
    //     (otpRecord.expiresAt.getTime() - now.getTime()) / 1000
    //   );

    //   throw new ApiError(
    //     403,
    //     `You can't request another OTP before ${remainingTime} seconds.`
    //   );
    // }
    const token = generateRegisterToken({ email });
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "OTP sent to your email. Please check!",
      data: { token },
    });
    const otp = generateOTP();
    // await setCache(email, otp, 300);
    // await UserService.sendPhoneVerification(phone, otp);
    await sendOTPEmailRegister(user.firstName, email, otp);
    await saveOTP(email, otp);
    // await saveOTP(email, otp); // Save OTP with expiration
  },
);

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  let decoded: any;
  try {
    decoded = verifyToken(req.headers.authorization);
    console.log(decoded);
  } catch (error: any) {
    return sendError(res, error);
  }
  // if (!decoded.role) {
  //   throw new ApiError(401, "Invalid token. Please try again.");
  // }
  const email = decoded.email as string;

  const { password } = req.body;
  console.log(password);
  if (!password) {
    throw new ApiError(400, "Please provide  password ");
  }
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully.",
    data: null,
  });

  const user = await findUserByEmail(email);

  if (!user) {
    throw new ApiError(
      404,
      "User not found. Are you attempting something sneaky?",
    );
  }
  const newPassword = await hashPassword(password);
  user.password = newPassword;
  await user.save();
});

export const verifyOTP = catchAsync(async (req: Request, res: Response) => {
  const { otp } = req.body;
  console.log("dsfdsfsdf");
  try {
    const { token, name, email } = await UserService.verifyOTPService(
      otp,
      req.headers.authorization as string,
    );

    const user = (await UserModel.findOne({ email })) as any;
    console.log(user);
    // Mark user as verified, if needed
    if (!user.isVerified) {
      console.log("sdfdf");
      user.isVerified = true;
      await user.save();
    }
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "OTP Verified successfully.",
      data: { name, token, role: user.role },
    });
  } catch (error: any) {
    throw new ApiError(500, error.message || "Failed to verify otp");
  }
});

// User Id
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { firstName, lastName, dateOfBirth, bio } = req.body;

  const decoded = req.user as IUserPayload;
  const userId = decoded.id;

  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const updateData: any = {};

  if (firstName) updateData.name = firstName;
  if (lastName) updateData.surname = lastName;
  if (dateOfBirth) updateData.contact = dateOfBirth;
  if (bio) updateData.address = bio;

  // // Email update – SAFE way
  // if (email && email !== user.email) {
  //   const emailExists = await UserModel.findOne({
  //     email,
  //     _id: { $ne: userId },
  //   });

  //   if (emailExists) {
  //     throw new ApiError(409, "Email already in use.");
  //   }

  //   updateData.email = email;
  // }

  if (req.file) {
    updateData.image = `/images/${req.file.filename}`;
  }

  const updatedUser = await UserService.updateUserById(userId, updateData);

  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated.",
    data: {
      _id: updatedUser?._id,
      name: `${updatedUser?.firstName} ${updatedUser?.lastName}`,
      email: updatedUser?.email,
    },
  });
});

export const getSelfInfo = catchAsync(async (req: Request, res: Response) => {
  try {
    const decoded = req.user as IUserPayload;

    const userId = decoded.id as string;

    // Find the user in DB
    const user = await findUserById(userId);
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    // Prepare base response (common fields)
    const responseData: any = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture || null,
      role: user.role,
    };

    // Send final response
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profile information retrieved successfully",
      data: responseData,
      pagination: undefined,
    });
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || 500,
      error.message ||
        "Unexpected error occurred while retrieving user information.",
    );
  }
});

export const uploadProfilePicture = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;
    const payload: any = {};
    if (req.file) {
      payload.image = `/image/${req.file.filename}`;
    }

    const uploadImage = await UserModel.findOneAndUpdate(
      { _id: userId },
      payload,
    ).select("-password");

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Image uploaded successfully",
      data: uploadImage,
    });
  },
);

// delete user
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const id = req.query?.id as string;
    const deleteableuser = await findUserById(id);
    if (!deleteableuser) {
      throw new ApiError(404, "User not found.");
    }
    if (deleteableuser.isDeleted) {
      throw new ApiError(404, "This account is already deleted.");
    }
    if ((req.user as IUserPayload)?.id !== id) {
      throw new ApiError(
        403,
        "You cannot delete this account. Please contact support",
      );
    }

    await UserService.userDelete(id, deleteableuser.email);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Account deleted successfully",
      data: null,
    });
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Unexpected error occurred while deleting the user.",
    );
  }
});

export const changePassword = catchAsync(
  async (req: Request, res: Response) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        throw new Error("Please provide both old password and new password.");
      }

      const decoded = req.user as IUserPayload;
      const email = decoded.email as string;
      const user = await findUserByEmail(email);

      if (!user) {
        throw new Error("User not found.");
      }

      const isMatch = await argon2.verify(user.password as string, oldPassword);
      if (!isMatch) {
        throw new ApiError(
          httpStatus.UNAUTHORIZED,
          "Old password is incorrect.",
        );
      }

      const hashedNewPassword = await argon2.hash(newPassword);
      user.password = hashedNewPassword;
      await user.save();

      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "You have successfully changed your password.",
        data: null,
      });
    } catch (error: any) {
      throw new ApiError(
        error.statusCode || 500,
        error.message || "Failed to change password.",
      );
    }
  },
);

const adminloginUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne(email);
    if (!user) {
      throw new ApiError(401, "This account does not exist.");
    }

    if (user.role !== "admin") {
      throw new ApiError(403, "Only admins can login.");
    }

    // Check password validity
    const isPasswordValid = await argon2.verify(
      user.password as string,
      password,
    );
    if (!isPasswordValid) {
      throw new ApiError(401, "Wrong password!");
    }

    const userId = user._id as string;

    // Generate new token for the logged-in user
    const token = generateTokenForAdmin({
      id: userId,
      email: user.email,
      role: user.role,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Login complete!",
      data: {
        user: {
          id: user._id,
          name: user.firstName,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error: any) {
    throw new ApiError(
      error.statusCode || 500,
      error.message || "An error occurred during admin login.",
    );
  }
});

//admin dashboard----------------------------------------------------------------------------------------

// add device id

const addDeviceId = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayloadWithUser;
  const { deviceId } = req.body;
  await UserModel.findByIdAndUpdate(
    user.id,
    { deviceId: deviceId },
    { new: true },
  );
  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Device ID added successfully",
    data: null,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  let decoded;
  try {
    decoded = verifyToken(req.headers.authorization);
  } catch (error: any) {
    return sendError(res, error); // If token verification fails, send error response.
  }

  const adminId = decoded.id as string;

  // Verify if admin exists
  const user = await findUserById(adminId);
  if (!user) {
    throw new ApiError(404, "This admin account does not exist.");
  }

  // Pagination and filters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const { date, name, email, role, requestStatus } = req.query;

  try {
    // Get the user list based on pagination and filters
    const { users, pagination } = await UserService.getUserList(
      skip,
      limit,
      date as string,
      name as string,
      email as string,
      role as string,
      requestStatus as string,
    );

    if (users.length === 0) {
      return sendResponse(res, {
        statusCode: httpStatus.NO_CONTENT,
        success: true,
        message: "No user found based on your search.",
        data: [],
        pagination: {
          ...pagination,
          prevPage: pagination.prevPage ?? 0,
          nextPage: pagination.nextPage ?? 0,
        },
      });
    }

    // Populate manager info for each user
    const usersWithManagerInfo = await UserModel.populate(users, {
      path: "managerInfoId",
      select: "type businessAddress websiteLink governMentImage.publicFileURL",
    });

    // Format response data
    const responseData = usersWithManagerInfo.map((user: any) => ({
      _id: user._id,
      image: user.image?.publicFileURL,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      //isRequest: user.isRequest,
      managerInfo: user.managerInfoId
        ? {
            type: user.managerInfoId.type,
            businessAddress: user.managerInfoId.businessAddress,
            websiteLink: user.managerInfoId.websiteLink,
            governMentImage: user.managerInfoId.governMentImage?.publicFileURL,
            isRequest: user.isRequest,
          }
        : null,
      createdAt: user.createdAt,
    }));

    // Send response with pagination details
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "User list retrieved successfully",
      data: responseData,
      pagination: {
        ...pagination,
        prevPage: pagination.prevPage ?? 0,
        nextPage: pagination.nextPage ?? 0,
      },
    });
  } catch (error: any) {
    // Handle any errors during the user fetching or manager population
    throw new ApiError(
      error.statusCode || 500,
      error.message || "Failed to retrieve users.",
    );
  }
});

// make admin delete

// update admin information

const updateAdminInformation = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const { name, email, phone } = req.body;

    const userPayload: { name: any; email: any; phone: any; image?: string } = {
      name,
      email,
      phone,
    };

    if (req.file) {
      userPayload.image = `/images/${req.file.filename}`;
    }

    const updateAdmin = await UserModel.findByIdAndUpdate(
      { _id: user.id },
      userPayload,
      { new: true },
    );

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Admin data updated successfully",
      data: updateAdmin,
    });
  } catch (err) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "Something went wrong",
      data: null,
    });
  }
};

// update admin password

// const updateAdminPassword = async (req: Request, res: Response) => {
//   const user = req.user as JwtPayloadWithUser;
//   const userId = user.id;

//   const findadmin = await UserModel.findById(userId);
//   const { oldPassword, newPassword, confirmPassword } = req.body;

//   const isPasswordValid = await argon2.verify(
//     findadmin.password as string,
//     oldPassword
//   );

//   if (!isPasswordValid) {
//     return sendResponse(res, {
//       statusCode: 404,
//       success: false,
//       message: "Old password not matched",
//       data: null,
//     });
//   }

//   if (newPassword !== confirmPassword) {
//     return sendResponse(res, {
//       statusCode: 404,
//       success: false,
//       message: "password and confirm password are not matched",
//       data: null,
//     });
//   }

//   const hashedPassword = await hashPassword(newPassword);

//   const updatePass = await UserModel.findByIdAndUpdate(
//     { _id: userId },
//     { password: hashedPassword },
//     { new: true }
//   );

//   return sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "password updated successfully",
//     data: null,
//   });
// };

const getAdminInfo = async (req: Request, res: Response) => {
  res.status(200).json({ user: req.user });
};

export const getAllCustomers = async (req: Request, res: Response) => {
  try {
    // Get query params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get optional search filter
    const search = (req.query.search as string) || "";

    // Build search condition
    const searchCondition = {
      role: "customer",
      ...(search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
              { phone: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
    };

    // Get total count
    const totalCustomers = await UserModel.countDocuments(searchCondition);

    // Fetch paginated data
    const allCustomers = await UserModel.find(searchCondition)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate pagination info
    const totalPage = Math.ceil(totalCustomers / limit);
    const pagination = {
      totalPage,
      currentPage: page,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPage ? page + 1 : null,
      totalData: totalCustomers,
    };

    return res.status(200).json({
      success: true,
      message: "Customers fetched successfully",
      data: allCustomers,
      pagination,
    });

    // return sendResponse(res, {
    //   statusCode: 200,
    //   success: true,
    //   message: "Customers fetched successfully",
    //   data: allCustomers,
    //   pagination,
    // });
  } catch (error: any) {
    console.error("Error fetching customers:", error);
    return sendResponse(res, {
      statusCode: 500,
      success: false,
      message: "Failed to fetch customers",
      data: error.message,
    });
  }
};

export const searchSubadmin = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (!search || typeof search !== "string") {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Case-insensitive search using regex
    const users = await UserModel.find({
      $or: [
        { email: { $regex: search, $options: "i" }, role: "subadmin" },
        { name: { $regex: search, $options: "i" }, role: "subadmin" },
      ],
    }).select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

const getAllSubadmin = async (req: Request, res: Response) => {
  const allSubadmins = await UserModel.find({ role: "subadmin" });

  return sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Customer fetched successfully",
    data: allSubadmins,
  });
};

const updateUserStatus = async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const status = req.params.status;

  const findUser = await UserModel.findById(userId);

  if (!["active", "blocked"].includes(status)) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "Status is not valid",
      data: null,
    });
  }

  const findBarber = await UserModel.findById(userId);

  if (!findBarber) {
    return sendResponse(res, {
      statusCode: 404,
      success: false,
      message: "User not registered",
      data: null,
    });
  }

  const updateUserStatus = await UserModel.findByIdAndUpdate(
    { _id: userId },
    { status },
    { new: true },
  );

  // send Notification
  // // --------> Emit notification <----------------
  // Convert the created user's id to a mongoose ObjectId type.
  const user: any = findUser;
  // Create a payload for notifications with messages for both the user and the admin.
  const notificationPayload: any = {
    userId: user?._id,
    userMsgTittle: "User Status updated successfully",
    adminMsgTittle: `Profile status updated to ${status}`,
    userMsg: `Your profile status have been updated to ${status}`,
    adminMsg: `${user.name} satatus successfully changed to ${status}`,
  };

  // Emit the notification.
  await emitNotification(notificationPayload);
  // --------> End Emit notification <----------------
  // --------> Send push notification via FCM (if fcmToken is provided) <----------------
  if (user.fcmToken) {
    try {
      // Define the base push message.
      const pushMessage = {
        title: `Your status have been changed to ${status}`,
        body: `Your status have been changed to ${status}`,
      };

      // Send the push notification.
      await sendPushNotification(user.fcmToken, pushMessage);
    } catch (pushError) {
      // Log any push notification errors without affecting the client response.
      console.error("Error sending push notification:", pushError);
    }
  }
  // send notification
  // --------> End push notification <----------------
  return sendResponse(res, {
    statusCode: 200,
    success: false,
    message: "Barber status updated successfully",
    data: updateUserStatus,
  });
};

// get admin profile

const getAdminProfile = async (req: Request, res: Response) => {
  const getAdmin = await UserModel.findOne({ role: "admin" });

  return sendResponse(res, {
    statusCode: 200,
    success: false,
    message: "Admin found successfully",
    data: getAdmin,
  });
};

export const searchCustomer = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (!search || typeof search !== "string") {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Case-insensitive search using regex
    const users = await UserModel.find({
      $or: [
        { email: { $regex: search, $options: "i" }, role: "customer" },
        { name: { $regex: search, $options: "i" }, role: "customer" },
      ],
    }).select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

// reset admin password

export const resetAdminPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { phone, otp, password } = req.body;

    if (!phone) throw new ApiError(400, "Phone number is required.");
    if (!otp) throw new ApiError(400, "OTP is required.");
    if (!password) throw new ApiError(400, "Password is required.");

    // 1️⃣ Verify OTP
    const otpRecord = await OTPModel.findOne({ phone, otp });
    if (!otpRecord) {
      throw new ApiError(400, "Invalid or expired OTP.");
    }

    // Optional: check if OTP is expired
    const now = new Date();
    if (otpRecord.expiresAt && otpRecord.expiresAt < now) {
      throw new ApiError(400, "OTP has expired.");
    }

    // 2️⃣ Find user
    const user = await UserModel.findOne({ phone });
    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    // 3️⃣ Hash and update password
    user.password = await hashPassword(password);

    // Mark as verified if needed
    if (!user.isVerified) user.isVerified = true;

    await user.save();

    // 4️⃣ Delete OTP after successful reset
    await OTPModel.deleteOne({ _id: otpRecord._id });

    // 5️⃣ Send response
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Password reset successfully.",
      data: {
        email: user.email,
        name: user.firstName,
      },
    });
  },
);

// count total customer

export const dashboardStats = async (req: Request, res: Response) => {
  try {
    const totalCustomer = await UserModel.find({
      role: "customer",
    }).countDocuments();
    const totalBarber = await UserModel.find({
      role: "barber",
    }).countDocuments();

    const dashboardStats = {
      totalCustomer,
      totalBarber,
    };

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Total customer retrived successfully",
      data: dashboardStats,
    });
  } catch (err) {
    console.log(err);
  }
};

// add superadmin

// export const addSuperadmin = catchAsync(async (req: Request, res: Response) => {
//   const { name, password, phone, email } = req.body;

//   (async () => {
//     try {
//       const hashedPassword = await hashPassword(password);
//       let image: any = {
//         path: "",
//         publicFileURL: "",
//       };
//       if (req.file) {
//         const imagePath = `public\\images\\${req.file.filename}`;
//         const publicFileURL = `/images/${req.file.filename}`;
//         image = {
//           path: imagePath,
//           publicFileURL: publicFileURL,
//         };
//       }
//       // Pass role to createUser
//       const createdUser: any = await UserModel.create({
//         name,
//         password: hashedPassword,
//         phone,
//         email,
//         image: image.publicFileURL,
//         role: "subadmin",
//         status: "active",
//         isVerified: true,
//       });

//       return sendResponse(res, {
//         statusCode: 200,
//         success: true,
//         message: "Super admin created successfully",
//         data: createdUser,
//       });
//     } catch (backgroundError: any) {
//       console.error("Error in background tasks:", backgroundError?.message);
//       return sendResponse(res, {
//         statusCode: 400,
//         success: false,
//         message: "Something went wrong",
//         data: null,
//       });
//     }
//   })();
// });

// export const logoutUser = async (req: Request, res: Response) => {
//   try {
//     const user = req.user as JwtPayloadWithUser;
//     const userId = user.id;
//     const updateLoginStatus = await UserModel.findByIdAndUpdate(
//       userId,
//       { isLogin: false },
//       { new: true, upsert: true }
//     ).select("name phone email  role isLogin");

//     const token = generateToken({
//       id: userId,
//       email: updateLoginStatus.email,
//       role: updateLoginStatus.role,
//     });

//     return sendResponse(res, {
//       statusCode: 200,
//       success: true,
//       message: "User logout successfully",
//       data: { user: updateLoginStatus, token },
//     });
//   } catch (err) {
//     return sendResponse(res, {
//       statusCode: 400,
//       success: false,
//       message: "Your login failed",
//       data: null,
//     });
//   }
// };

// ─────────────────────────────────────────────────────────────
// GET /users/me
// ─────────────────────────────────────────────────────────────

export const getProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;

    const user = await getUserProfile(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /users/me
// ─────────────────────────────────────────────────────────────

export const updateProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const user = await updateUserProfile(userId, req.body);
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /users/me/onboarding
// ─────────────────────────────────────────────────────────────

export const completeOnboarding = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const result = await completeOnboardingService(userId, req.body);
    res.json({
      success: true,
      message: `Welcome! You've been matched with ${result.assignedTrainer.name}`,
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /users/me/subscribe/:trainerId
// ─────────────────────────────────────────────────────────────

import { subscribeToTrainer as subscribeToTrainerService } from "./user.service";

export const subscribeToTrainer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const user = await subscribeToTrainerService(userId, req.params.trainerId);
    res.json({ success: true, message: "Subscribed successfully", data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /users/me/history
// ─────────────────────────────────────────────────────────────

export const getHistory = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = (req.user as JwtPayloadWithUser).id;
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await getUserWorkoutHistory(userId, limit);
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /users/me/memory/:trainerId
// ─────────────────────────────────────────────────────────────

export const getMemory = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as JwtPayloadWithUser;
    const userId = user.id;

    const memory = await getUserMemory(userId, req.params.trainerId);
    res.json({ success: true, data: memory });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const getProfileInfo = async (req: Request, res: Response) => {
  const user = req.user as JwtPayloadWithUser;
  const userId = user.id;

  if (user.role === "customer") {
    const getCustomerInfo = await UserModel.findOne({ _id: userId });

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User information retrieved successfully",
      data: getCustomerInfo,
    });
  } else if (user.role === "barber") {
    const getBarberInfo = await UserModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "barbers",
          localField: "_id",
          foreignField: "userId",
          as: "barberInfo",
        },
      },
      { $unwind: { path: "$barberInfo", preserveNullAndEmptyArrays: true } },

      // Merge both documents (barber first so it overwrites user fields)
      {
        $replaceRoot: {
          newRoot: { $mergeObjects: ["$barberInfo", "$$ROOT"] },
        },
      },

      // Rename _id (barber's) → barberId and rename original userId
      {
        $addFields: {
          barberId: "$barberInfo._id",
          userId: "$barberInfo.userId",
        },
      },

      // Remove unnecessary fields
      {
        $project: {
          _id: 0,
          barberInfo: 0,
          password: 0,
          __v: 0,
        },
      },
    ]);

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User information retrieved successfully",
      data: getBarberInfo[0],
    });
  }
};

// export const deviceLoginUser = catchAsync(
//   async (req: Request, res: Response) => {
//     const { deviceId, fcmToken } = req.body;
//     const user = await UserModel.findOne({ deviceId });
//     if (!user) {
//       throw new ApiError(401, "This account does not exist.");
//     }
//     const userId = user._id as string;

//     // If user is not verified, send OTP and return a verification token
//     const verifyToken = generateToken({
//       id: userId,
//       phone: user.phone,
//       role: user.role,
//       isLogin: user.isLogin,
//     });

//     // if (!user.isVerified) {
//     //   const name = user.name as string;
//     //   const otp = generateOTP();
//     //   // Fire-and-forget email/phone OTP send, but persist OTP
//     //   sendOTPEmailVerification(name, user.phone, otp).catch((err) =>
//     //     console.error("Error sending OTP email:", err)
//     //   );
//     //   await saveOTP(user.phone, otp);

//     //   return sendResponse(res, {
//     //     statusCode: 401,
//     //     success: false,
//     //     message: "We've sent an OTP to your phone to verify your profile.",
//     //     data: {
//     //       role: user.role,
//     //       token: verifyToken,
//     //     },
//     //   });
//     // }

//     // Mark user as logged in
//     const updateLogin = await UserModel.findByIdAndUpdate(
//       user._id,
//       { isLogin: true },
//       { new: true, upsert: true }
//     );

//     const token = generateToken({
//       id: userId,
//       phone: user.phone,
//       role: user.role,
//       isLogin: updateLogin.isLogin,
//     });

//     // Update fcmToken if provided
//     if (fcmToken) {
//       user.fcmToken = fcmToken;
//       await user.save();
//     }

//     return sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Login complete!",
//       data: {
//         user: {
//           _id: user._id,
//           name: user?.name,
//           email: user?.email,
//           phone: user?.phone,
//           image: user?.image || "",
//           role: user?.role,
//           isLogin: updateLogin.isLogin,
//         },
//         token,
//       },
//     });
//   }
// );

const UserController = {
  registerUser,
  resendOTP,
  verifyOTP,
  // updateUser,
  // getSelfInfo,
  // deleteUser,
  // changePassword,
  // adminloginUser,
  getAllUsers,

  // updateAdminInformation,
  // // updateAdminPassword,
  // getAdminInfo,
  // updateUserStatus,
  // searchCustomer,
  // getAdminProfile,
  // getAllSubadmin,
  // addDeviceId,
  // // deviceLoginUser,
};

export { UserController };
