import dns from "dns";
import mongoose from "mongoose";
import { DATABASE_URL } from "../config";
import { registerUserService } from "../modules/user/user.service";
import { loginUser } from "../modules/user/user.controller";
import { UserModel, OTPModel } from "../modules/user/user.model";
import { Request, Response } from "express";

dns.setServers(["1.1.1.1", "1.0.0.1"]);

async function runTests() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB successfully!");

  const testEmail = "testfcm@example.com";

  // Clean up existing test user if any
  console.log(`Cleaning up existing test user with email ${testEmail}...`);
  await UserModel.deleteOne({ email: testEmail });
  await OTPModel.deleteMany({ email: testEmail });

  console.log("--------------------------------------------------");
  console.log("TEST 1: Registration FCM Token capture");
  console.log("--------------------------------------------------");

  const registerPayload = {
    body: {
      firstName: "Test",
      lastName: "Fcm",
      email: testEmail,
      dateOfBirth: "1990-01-01",
      password: "securepassword123",
      gender: "male",
      bio: "Test bio",
      role: "user",
      fcmToken: "initial-test-fcm-token",
    }
  };

  const registerResult = await registerUserService(registerPayload);
  if (!registerResult || !registerResult.success) {
    throw new Error("Registration service failed");
  }

  // Retrieve user directly from DB
  const createdUser = await UserModel.findOne({ email: testEmail });
  if (!createdUser) {
    throw new Error("User was not found in the database after registration.");
  }

  console.log(`Created user ID: ${createdUser._id}`);
  console.log(`Captured FCM token: ${createdUser.fcmToken}`);

  if (createdUser.fcmToken !== "initial-test-fcm-token") {
    throw new Error(`Expected FCM token 'initial-test-fcm-token', but got '${createdUser.fcmToken}'`);
  }
  console.log("✅ TEST 1 PASSED: Registration successfully captures and saves the FCM Token!");

  console.log("--------------------------------------------------");
  console.log("TEST 2: Login FCM Token update");
  console.log("--------------------------------------------------");

  // Mark user as verified so they can log in without verification error block
  createdUser.isVerified = true;
  await createdUser.save();
  console.log("Marked test user as verified.");

  // Simulate login request
  const mockReq = {
    body: {
      email: testEmail,
      password: "securepassword123",
      fcmToken: "updated-test-fcm-token",
    }
  } as Request;

  let responseData: any = null;
  const mockRes = {
    status: function (code: number) {
      return this;
    },
    json: function (payload: any) {
      responseData = payload;
      return this;
    }
  } as unknown as Response;

  // Execute loginUser handler
  await loginUser(mockReq, mockRes, () => {});

  // Wait for catchAsync background promise to settle
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Retrieve updated user from DB
  const updatedUser = await UserModel.findOne({ email: testEmail });
  if (!updatedUser) {
    throw new Error("User was not found in the database after login.");
  }

  console.log(`Updated FCM token: ${updatedUser.fcmToken}`);
  if (updatedUser.fcmToken !== "updated-test-fcm-token") {
    throw new Error(`Expected updated FCM token 'updated-test-fcm-token', but got '${updatedUser.fcmToken}'`);
  }
  console.log("✅ TEST 2 PASSED: Login successfully updates the FCM Token on the user document!");

  // Clean up
  console.log("Cleaning up test user...");
  await UserModel.deleteOne({ email: testEmail });
  await OTPModel.deleteMany({ email: testEmail });
  console.log("Test user cleaned up successfully.");

  await mongoose.disconnect();
  console.log("Done.");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  mongoose.disconnect().finally(() => {
    process.exit(1);
  });
});
