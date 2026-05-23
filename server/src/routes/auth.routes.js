import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is not set on the server. Add it to your environment variables and restart."
    );
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    provider: user.provider,
    role: user.role,
    addresses: user.addresses,
    loyaltyPoints: user.loyaltyPoints,
  };
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: cleanEmail,
      phone,
      password: hashedPassword,
      provider: "email",
    });

    const token = createToken(user._id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    console.error("[signup] failed:", error);
    res
      .status(500)
      .json({ message: error.message || "Signup failed. Please contact support." });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 🔥 Hardcoded admin login from env (works without DB).
    if (
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      cleanEmail === String(process.env.ADMIN_EMAIL).trim().toLowerCase() &&
      password === process.env.ADMIN_PASSWORD
    ) {
      return res.json({
        token: "admin-token",
        user: { name: "Admin", email: cleanEmail, role: "admin" },
      });
    }

    // Normal user login (also supports DB-stored admins).
    const user = await User.findOne({ email: cleanEmail });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = createToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error("[signin] failed:", error);
    res
      .status(500)
      .json({ message: error.message || "Signin failed. Please contact support." });
  }
});

// Demo Google login. Replace with verified Google ID token in production.
router.post("/google", async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!email) return res.status(400).json({ message: "Google email is required" });

    const cleanEmail = String(email).trim().toLowerCase();
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: name || "Google Customer",
        email: cleanEmail,
        provider: "google",
      });
    }

    const token = createToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error("[google signin] failed:", error);
    res
      .status(500)
      .json({ message: error.message || "Google signin failed" });
  }
});

export default router;
