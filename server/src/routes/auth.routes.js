import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

function createToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    provider: user.provider,
    addresses: user.addresses,
    loyaltyPoints: user.loyaltyPoints
  };
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, password: hashedPassword, provider: "email" });

    res.status(201).json({ token: createToken(user._id), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
});
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  // 🔥 HARD ADMIN LOGIN
  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return res.json({
      token: "admin-token",
      user: {
        name: "Admin",
        email,
        role: "admin"
      }
    });
  }

  // 👇 normal user login
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  res.json({
    token: createToken(user._id),
    user
  });
});
// Demo Google login. Replace with verified Google ID token in production.
router.post("/google", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) return res.status(400).json({ message: "Google email is required" });

    let user = await User.findOne({ email });
    if (!user) user = await User.create({ name: name || "Google Customer", email, provider: "google" });

    res.json({ token: createToken(user._id), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Google signin failed", error: error.message });
  }
});

export default router;
