/**
 * Import all videos from public/media/default_content into MongoDB.
 * Title is derived from the file name (underscores → spaces, _female/_male stripped).
 *
 * Usage:
 *   npm run seed:default-content
 */

import dns from "dns";
import mongoose from "mongoose";
import { DATABASE_URL } from "../config";
import { seedDefaultContentFromDisk } from "../modules/defaultContent/defaultContent.service";

dns.setServers(["1.1.1.1", "1.0.0.1"]);

async function main() {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  await mongoose.connect(DATABASE_URL);
  console.log("Connected to MongoDB");

  const result = await seedDefaultContentFromDisk();
  console.log(JSON.stringify(result, null, 2));

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
