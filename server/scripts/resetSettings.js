// Usage: node scripts/resetSettings.js
// Deletes the existing RestaurantSettings document so the server can
// recreate a fresh one with the new schema on next request.
// Safe to run any time - admin settings will return to defaults.

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import RestaurantSettings from "../src/models/RestaurantSettings.js";

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("Error: MONGO_URI is not set in the environment.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Bypass mongoose casting and delete at the collection level.
  const result = await RestaurantSettings.collection.deleteMany({});
  console.log(`✓ Deleted ${result.deletedCount} settings document(s).`);
  console.log("A fresh document with the new schema will be created on the next request.");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
