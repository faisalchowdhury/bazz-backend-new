/**
 * Seed or refresh all 7 built-in P2P trainers (users + profiles + knowledge packs + categories).
 *
 * Usage:
 *   npm run seed:trainers
 */

import dns from "dns";
import mongoose from "mongoose";
import { DATABASE_URL } from "../config";
import { seedBuiltInTrainers } from "../DB/seedBuiltInTrainers";

dns.setServers(["1.1.1.1", "1.0.0.1"]);

async function main() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB");

  const results = await seedBuiltInTrainers();
  console.log(JSON.stringify(results, null, 2));

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
