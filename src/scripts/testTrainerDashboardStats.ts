import dns from "dns";
import mongoose from "mongoose";
import { DATABASE_URL } from "../config";
import { TrainerModel } from "../modules/trainer/trainer.model";
import { getTrainerDashboardStatsService } from "../modules/trainer/trainer.service";

dns.setServers(["1.1.1.1", "1.0.0.1"]);

async function main() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB successfully!");

  // Find an active trainer
  const trainer = await TrainerModel.findOne({ isActive: true });
  if (!trainer) {
    console.log("No active trainers found in the database. Testing error path...");
    try {
      await getTrainerDashboardStatsService(new mongoose.Types.ObjectId().toString());
      console.error("✗ [FAILED] Expected service to throw for invalid/non-existent user");
      process.exit(1);
    } catch (err: any) {
      console.log("✓ [PASSED] Service threw expected error for non-existent user:", err.message);
    }
  } else {
    console.log(`Found active trainer: ${trainer.name} (User: ${trainer.userId})`);
    try {
      const stats = await getTrainerDashboardStatsService(trainer.userId.toString());
      console.log("✓ [PASSED] Successfully retrieved stats:", JSON.stringify(stats, null, 2));

      // Validate stats structure
      if (
        stats &&
        typeof stats.activeUsersCount === "number" &&
        stats.newUsersThisWeek &&
        typeof stats.newUsersThisWeek.calendarWeek === "number" &&
        typeof stats.newUsersThisWeek.rolling7Days === "number" &&
        stats.contentStats &&
        typeof stats.contentStats.total === "number" &&
        stats.workoutBlocksStats &&
        typeof stats.workoutBlocksStats.total === "number"
      ) {
        console.log("✓ [PASSED] Stats response structure is correct and type-safe!");
      } else {
        console.error("✗ [FAILED] Stats response is missing required fields or has incorrect types");
        process.exit(1);
      }
    } catch (err: any) {
      console.error("✗ [FAILED] Error fetching dashboard stats:", err.message);
      process.exit(1);
    }
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB. Test passed successfully!");
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});