import dns from "dns";
import mongoose from "mongoose";
import { DATABASE_URL } from "../config";
import { UserModel } from "../modules/user/user.model";
import { TrainerModel } from "../modules/trainer/trainer.model";
import { NotificationModel } from "../modules/notifications/notification.model";
import { sendTrainerRequest, acceptRequest } from "../modules/trainerRequest/trainerRequest.service";
import { TrainerRequestModel } from "../modules/trainerRequest/trainerRequest.model";
import { createUpdate } from "../modules/update/update.service";
import { UpdateModel } from "../modules/update/update.model";
import { requestWithdrawal } from "../modules/withdrawal/withdrawal.service";
import { WithdrawalModel } from "../modules/withdrawal/withdrawal.model";
import { PaymentModel } from "../modules/payment/payment.model";
import { SubscriptionModel } from "../modules/subscription/subscription.model";
import { expireSubscriptions } from "../modules/subscription/subscription.service";

dns.setServers(["1.1.1.1", "1.0.0.1"]);

async function testAllTriggers() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DATABASE_URL);
  console.log("Connected successfully!");

  // Clean up any residual test data from previous partial runs
  console.log("Cleaning up potential residual test data...");
  await UserModel.deleteMany({
    email: { $in: ["client_test@example.com", "trainer_test@example.com", "admin_test@example.com"] },
  });
  await TrainerModel.deleteMany({
    name: "Trainer Test",
  });
  await NotificationModel.deleteMany({
    adminMsgTittle: { $in: ["New Incoming Request 📩", "Request Accepted! 🎉", "New Withdrawal Request 💰", "Subscription Expired 🔴"] },
  });
  // Clean up any update notification
  await NotificationModel.deleteMany({
    adminMsgTittle: /New Update from Trainer/i,
  });

  console.log("Setting up mock database documents...");

  // 1. Create a dummy client user
  const clientUser: any = await UserModel.create({
    firstName: "Client",
    lastName: "Test",
    email: "client_test@example.com",
    password: "secure_password",
    role: "user",
    isVerified: true,
    gender: "male",
    fcmToken: "client-fcm-token",
  });

  // 2. Create a dummy trainer user + trainer profile
  const trainerUser: any = await UserModel.create({
    firstName: "Trainer",
    lastName: "Test",
    email: "trainer_test@example.com",
    password: "secure_password",
    role: "trainer",
    isVerified: true,
    gender: "male",
    fcmToken: "trainer-fcm-token",
  });

  const trainerProfile: any = await TrainerModel.create({
    userId: trainerUser._id,
    name: "Trainer Test",
    specialty: "muscle_gain",
    bio: "Test bio",
    isBuiltIn: false,
  });

  // 3. Create a dummy admin user
  const adminUser: any = await UserModel.create({
    firstName: "Admin",
    lastName: "Test",
    email: "admin_test@example.com",
    password: "secure_password",
    role: "admin",
    isVerified: true,
    gender: "male",
    fcmToken: "admin-fcm-token",
  });

  console.log("Mock documents successfully created.");

  // ==========================================================================
  // TRIGGER 1: User sends a request to any trainer
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 1: User sends request to Trainer (Trigger 1)");
  console.log("--------------------------------------------------");
  
  const reqObj: any = await sendTrainerRequest(
    clientUser._id.toString(),
    trainerProfile._id.toString(),
    "Please train me!"
  );

  // Check that the notification has been logged for the trainer
  const notif1 = await NotificationModel.findOne({
    userId: trainerUser._id,
    adminMsgTittle: "New Incoming Request 📩",
  });

  if (!notif1) {
    throw new Error("Trigger 1 failed: No notification logged in DB for trainer!");
  }
  console.log("✅ Trigger 1 Notification DB log verified successfully!");
  console.log(`Notification Message: "${notif1.userMsg}"`);

  // ==========================================================================
  // TRIGGER 2: Trainer accepts request
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 2: Trainer accepts Request (Trigger 2)");
  console.log("--------------------------------------------------");

  await acceptRequest(
    trainerProfile._id.toString(),
    reqObj._id.toString()
  );

  // Check that the notification has been logged for the client user
  const notif2 = await NotificationModel.findOne({
    userId: clientUser._id,
    adminMsgTittle: "Request Accepted! 🎉",
  });

  if (!notif2) {
    throw new Error("Trigger 2 failed: No notification logged in DB for user!");
  }
  console.log("✅ Trigger 2 Notification DB log verified successfully!");
  console.log(`Notification Message: "${notif2.userMsg}"`);

  // ==========================================================================
  // TRIGGER 3: Trainer sends any note or update
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 3: Trainer sends update to User (Trigger 3)");
  console.log("--------------------------------------------------");

  await createUpdate(
    trainerUser._id.toString(),
    clientUser._id.toString(),
    "High Protein Diet",
    "Keep up the high protein intake."
  );

  const notif3 = await NotificationModel.findOne({
    userId: clientUser._id,
    adminMsgTittle: `New Update from ${trainerUser.firstName} ${trainerUser.lastName} 📝`,
  });

  if (!notif3) {
    throw new Error("Trigger 3 failed: No notification logged in DB for user update!");
  }
  console.log("✅ Trigger 3 Notification DB log verified successfully!");
  console.log(`Notification Message: "${notif3.userMsg}"`);

  // ==========================================================================
  // TRIGGER 4: Trainer requests withdrawal
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 4: Trainer requests Withdrawal (Trigger 4)");
  console.log("--------------------------------------------------");

  // Create a mock payment first to establish earnings balance
  console.log("Creating mock payments to establish balance...");
  await PaymentModel.create({
    userId: clientUser._id,
    trainerId: trainerProfile._id,
    invoiceId: new mongoose.Types.ObjectId(),
    transactionId: "test_tx_notif_" + Date.now(),
    amount: 10000,
    gateway: "stripe",
    status: "verified",
    platformAmountCents: 2000,
    trainerAmountCents: 8000,
    verifiedAt: new Date(),
  });

  console.log("Submitting withdrawal request...");
  await requestWithdrawal(
    trainerProfile._id.toString(),
    5000, // $50.00 (within $80.00 available)
    "paypal",
    "trainer_payment@example.com",
    "Monthly payout"
  );

  // Check database notification to admin
  const notif4 = await NotificationModel.findOne({
    adminMsgTittle: "New Withdrawal Request 💰",
  });

  if (!notif4) {
    throw new Error("Trigger 4 failed: No notification logged in DB for admin withdrawal!");
  }
  console.log("✅ Trigger 4 Notification DB log verified successfully!");
  console.log(`Notification Message: "${notif4.adminMsg}"`);

  // ==========================================================================
  // TRIGGER 5: User subscription is over (expired)
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("TEST 5: Subscription expired trigger (Trigger 5)");
  console.log("--------------------------------------------------");

  // Create a past-due subscription
  console.log("Creating past-due subscription...");
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

  const subObj = await SubscriptionModel.create({
    userId: clientUser._id,
    trainerId: trainerProfile._id,
    invoiceId: new mongoose.Types.ObjectId(),
    status: "active",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: pastDate,
  });

  console.log("Running expireSubscriptions CRON task...");
  const expiredCount = await expireSubscriptions();
  console.log(`Expired ${expiredCount} subscription(s).`);

  // Check database notification for expired subscription
  const notif5 = await NotificationModel.findOne({
    userId: clientUser._id,
    adminMsgTittle: "Subscription Expired 🔴",
  });

  if (!notif5) {
    throw new Error("Trigger 5 failed: No subscription expired notification logged in DB!");
  }
  console.log("✅ Trigger 5 Notification DB log verified successfully!");
  console.log(`Notification Message: "${notif5.userMsg}"`);

  // ==========================================================================
  // CLEANUP SECTION
  // ==========================================================================
  console.log("\n--------------------------------------------------");
  console.log("Cleaning up mock databases...");
  console.log("--------------------------------------------------");
  
  await UserModel.deleteMany({
    _id: { $in: [clientUser._id, trainerUser._id, adminUser._id] },
  });
  await TrainerModel.deleteOne({ _id: trainerProfile._id });
  await TrainerRequestModel.deleteMany({
    trainerId: trainerProfile._id,
  });
  await UpdateModel.deleteMany({
    trainerUserId: trainerUser._id,
  });
  await PaymentModel.deleteMany({
    trainerId: trainerProfile._id,
  });
  await WithdrawalModel.deleteMany({
    trainerId: trainerProfile._id,
  });
  await SubscriptionModel.deleteMany({
    _id: subObj._id,
  });
  await NotificationModel.deleteMany({
    _id: { $in: [notif1._id, notif2._id, notif3._id, notif4._id, notif5._id] },
  });

  console.log("Database successfully cleaned up!");
  await mongoose.disconnect();
  console.log("Tests successfully completed with 100% success!");
}

testAllTriggers().catch((err) => {
  console.error("❌ Test failed:", err);
  mongoose.disconnect().finally(() => {
    process.exit(1);
  });
});
