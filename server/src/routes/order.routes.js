import express from "express";
import Order from "../models/Order.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const { customerName, phone, orderType, address, items, total, notes } = req.body;

  if (!customerName || !phone || !orderType || !items?.length || !total) {
    return res.status(400).json({ message: "Missing required order details" });
  }

  const order = await Order.create({
    user: req.user._id,
    customerName,
    phone,
    orderType,
    address,
    items,
    total,
    notes
  });

  res.status(201).json(order);
});

router.get("/my-orders", auth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

export default router;
