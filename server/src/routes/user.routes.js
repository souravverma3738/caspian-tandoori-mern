import express from "express";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", auth, async (req, res) => {
  res.json(req.user);
});

router.put("/me", auth, async (req, res) => {
  const { name, email, phone } = req.body;

  const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
  if (existing) return res.status(409).json({ message: "Email already in use" });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, email, phone },
    { new: true, runValidators: true }
  ).select("-password");

  res.json(user);
});

router.post("/addresses", auth, async (req, res) => {
  const { label, line1, line2, city, postcode, instructions } = req.body;

  if (!line1 || !city || !postcode) {
    return res.status(400).json({ message: "Address line 1, city and postcode are required" });
  }

  const user = await User.findById(req.user._id);
  user.addresses.push({ label, line1, line2, city, postcode, instructions });
  await user.save();

  res.status(201).json(user.addresses);
});

router.delete("/addresses/:addressId", auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter((address) => String(address._id) !== req.params.addressId);
  await user.save();

  res.json(user.addresses);
});

export default router;
