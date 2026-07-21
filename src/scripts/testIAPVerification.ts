import dns from "dns";
import mongoose from "mongoose";
import { DATABASE_URL } from "../config";
import { UserModel } from "../modules/user/user.model";
import { IAPSubscriptionModel } from "../modules/iap/iap.model";
import { verifyIAPSubscription } from "../modules/iap/iap.service";
import { getUserProfile } from "../modules/user/user.service";

dns.setServers(["1.1.1.1", "1.0.0.1"]);

async function runTests() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DATABASE_URL);
  console.log("Connected successfully!");

  const emailA = "user_a_test@example.com";
  const emailB = "user_b_test@example.com";

  console.log("Cleaning up potential residual test data...");
  await UserModel.deleteMany({ email: { $in: [emailA, emailB] } });
  await IAPSubscriptionModel.deleteMany({});

  console.log("Creating Mock Users...");
  const userA: any = await UserModel.create({
    firstName: "UserA",
    lastName: "Test",
    email: emailA,
    password: "secure_password",
    role: "user",
    isVerified: true,
    gender: "male",
  });

  const userB: any = await UserModel.create({
    firstName: "UserB",
    lastName: "Test",
    email: emailB,
    password: "secure_password",
    role: "user",
    isVerified: true,
    gender: "female",
  });

  console.log("Mock users created successfully!");

  // ==========================================================================
  // TEST 1: Fake verificationData with no mock triggers -> 402 Error
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 1: Fake/invalid verificationData (Expects 402)");
  console.log("--------------------------------------------------");

  try {
    // Set NODE_ENV to production temporarily to bypass offline mock triggers
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    await verifyIAPSubscription(
      userA._id.toString(),
      "ios",
      "month_1",
      "p_fake_123",
      "invalid-fake-jws-signature"
    );

    // Revert env
    process.env.NODE_ENV = originalEnv;
    throw new Error("TEST 1 FAILED: Did not reject invalid verificationData");
  } catch (err: any) {
    if (err.statusCode !== 402) {
      throw new Error(`TEST 1 FAILED: Expected 402 error, but got: ${err.statusCode} - ${err.message}`);
    }
    console.log("✅ TEST 1 PASSED: Rejected invalid verificationData with 402 Payment Required!");
  }

  // ==========================================================================
  // TEST 2: Valid iOS sandbox mock purchase for month_1 (Expects activated subscription)
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 2: iOS sandbox mock purchase for month_1 (Expects 30 days expiry)");
  console.log("--------------------------------------------------");

  const res2 = await verifyIAPSubscription(
    userA._id.toString(),
    "ios",
    "month_1",
    "p_ios_month_1",
    "sandbox-mock-passed"
  );

  if (!res2.isSubscribed || res2.subscriptionTier !== "monthly") {
    throw new Error(`TEST 2 FAILED: Expected subscription tier 'monthly', but got '${res2.subscriptionTier}'`);
  }

  // Verify dates
  const daysDiff = Math.ceil(
    (new Date(res2.subscriptionEndDate).getTime() - new Date(res2.subscriptionStartDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (daysDiff < 28 || daysDiff > 31) {
    throw new Error(`TEST 2 FAILED: Expected around 30 days duration, but got ${daysDiff} days`);
  }

  console.log("✅ TEST 2 PASSED: Successfully activated monthly iOS subscription!");
  console.log(`StartDate: ${res2.subscriptionStartDate}`);
  console.log(`EndDate: ${res2.subscriptionEndDate}`);

  // ==========================================================================
  // TEST 3: Idempotency check (Send same purchaseId for same user)
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 3: Idempotency (Same purchaseId sent again for User A)");
  console.log("--------------------------------------------------");

  const countBefore = await IAPSubscriptionModel.countDocuments();

  const res3 = await verifyIAPSubscription(
    userA._id.toString(),
    "ios",
    "month_1",
    "p_ios_month_1",
    "sandbox-mock-passed"
  );

  const countAfter = await IAPSubscriptionModel.countDocuments();

  if (countBefore !== countAfter) {
    throw new Error("TEST 3 FAILED: Idempotency failed, a duplicate subscription record was created!");
  }
  if (!res3.isSubscribed || res3.subscriptionTier !== "monthly") {
    throw new Error("TEST 3 FAILED: Subscription inactive on idempotent retry");
  }

  console.log("✅ TEST 3 PASSED: Idempotency verified successfully. No duplicate DB records created!");

  // ==========================================================================
  // TEST 4: Verification Conflict (Send same purchaseId for User B) -> 409 Error
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 4: Conflict (Same purchaseId claimed by User B)");
  console.log("--------------------------------------------------");

  try {
    await verifyIAPSubscription(
      userB._id.toString(),
      "ios",
      "month_1",
      "p_ios_month_1",
      "sandbox-mock-passed"
    );
    throw new Error("TEST 4 FAILED: Did not trigger 409 conflict error");
  } catch (err: any) {
    if (err.statusCode !== 409) {
      throw new Error(`TEST 4 FAILED: Expected 409 conflict, but got: ${err.statusCode} - ${err.message}`);
    }
    console.log("✅ TEST 4 PASSED: Successfully triggered 409 Conflict for double-claiming a purchase ID!");
  }

  // ==========================================================================
  // TEST 5: Android sandbox mock purchase for year_1 (Expects 365 days expiry)
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 5: Android sandbox mock purchase for year_1 (Expects 365 days expiry)");
  console.log("--------------------------------------------------");

  const res5 = await verifyIAPSubscription(
    userA._id.toString(),
    "android",
    "year_1",
    "p_and_year_1",
    "sandbox-mock-passed"
  );

  if (!res5.isSubscribed || res5.subscriptionTier !== "annual") {
    throw new Error(`TEST 5 FAILED: Expected subscription tier 'annual', but got '${res5.subscriptionTier}'`);
  }

  const daysDiff5 = Math.ceil(
    (new Date(res5.subscriptionEndDate).getTime() - new Date(res5.subscriptionStartDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (daysDiff5 < 360 || daysDiff5 > 366) {
    throw new Error(`TEST 5 FAILED: Expected around 365 days duration, but got ${daysDiff5} days`);
  }

  console.log("✅ TEST 5 PASSED: Successfully activated annual Android subscription!");
  console.log(`StartDate: ${res5.subscriptionStartDate}`);
  console.log(`EndDate: ${res5.subscriptionEndDate}`);

  // ==========================================================================
  // TEST 6: GET Profile (Expects correct subscription fields)
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 6: Retrieve profile /auth/me");
  console.log("--------------------------------------------------");

  const profile = await getUserProfile(userA._id.toString());
  if (!profile) {
    throw new Error("TEST 6 FAILED: Profile not found");
  }

  if (profile.subscriptionTier !== "annual") {
    throw new Error(`TEST 6 FAILED: Expected 'annual' tier, but got: ${profile.subscriptionTier}`);
  }
  if (!profile.subscriptionStartDate || !profile.subscriptionEndDate) {
    throw new Error("TEST 6 FAILED: Missing subscription start/end dates in profile");
  }

  console.log("✅ TEST 6 PASSED: Profile /auth/me returns updated subscription fields!");
  console.log(`Profile Tier: ${profile.subscriptionTier}`);
  console.log(`Profile End Date: ${profile.subscriptionEndDate}`);

  // ==========================================================================
  // CLEANUP SECTION
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("Cleaning up mock databases...");
  console.log("--------------------------------------------------");
  await UserModel.deleteMany({ email: { $in: [emailA, emailB] } });
  await IAPSubscriptionModel.deleteMany({});
  console.log("Database successfully cleaned up!");

  await mongoose.disconnect();
  console.log("\n🎉 ALL IAP VERIFICATION TESTS COMPLETED WITH 100% SUCCESS!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  mongoose.disconnect().finally(() => {
    process.exit(1);
  });
});
