// Usage: node scripts/setPassword.js <email> <newPassword> [role]
// Examples:
//   node scripts/setPassword.js admin@caspian.com mySecurePass123 admin
//   node scripts/setPassword.js souravverma1580@gmail.com newpass123
//
// - If the user exists, the password (and optionally role) are updated.
// - If the user does not exist, a new user is created.
// - Use this to rescue a locked-out account, or to seed an admin without env vars.

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

async function main() {
  const [, , emailArg, passwordArg, roleArg] = process.argv;

  if (!emailArg || !passwordArg) {
    console.error("Usage: node scripts/setPassword.js <email> <newPassword> [role]");
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    console.error("Error: MONGO_URI is not set in the environment.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const email = String(emailArg).trim().toLowerCase();
  const role = roleArg === "admin" ? "admin" : null;
  const hashed = await bcrypt.hash(passwordArg, 12);

  let user = await User.findOne({ email });

  if (user) {
    user.password = hashed;
    user.provider = "email";
    if (role) user.role = role;
    await user.save();
    console.log(`✓ Password updated for existing user ${email}${role ? ` (role=${role})` : ""}`);
  } else {
    user = await User.create({
      name: email.split("@")[0],
      email,
      password: hashed,
      provider: "email",
      role: role || "customer",
    });
    console.log(`✓ New ${user.role} created: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
