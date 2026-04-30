import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";


const router = express.Router();

router.use(auth);
router.use(adminOnly);

router.get("/dashboard", async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
   const ordersToday = await Order.find({ createdAt: { $gte: startOfDay } });
  const allOrders = await Order.find();
  const totalCustomers = await User.countDocuments({ role: "customer" });
  const pendingOrders = await Order.countDocuments({ status: "Pending" });
  const completedOrders = await Order.countDocuments({ status: "Completed" });

  const todayRevenue = ordersToday.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalRevenue = allOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  const itemCounts = {};
  allOrders.forEach((order) => {
    order.items.forEach((item) => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.qty;
    });
  });

  const bestSellingItems = Object.entries(itemCounts)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

   res.json({
    todayOrders: ordersToday.length,
    todayRevenue,
    totalOrders: allOrders.length,
    totalRevenue,
    totalCustomers,
    pendingOrders,
    completedOrders,
    bestSellingItems
  });
});
router.get("/orders", async (req, res) => {
  const { status, search } = req.query;

  const query = {};
  if (status && status !== "all") query.status = status;

  if (search) {
    query.$or = [
      { customerName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } }
    ];
  }

  const orders = await Order.find(query)
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });

  res.json(orders);
});
router.patch("/orders/:id/status", async (req, res) => {
  const { status } = req.body;

  const allowedStatuses = ["Pending", "Accepted", "Preparing", "Ready", "Completed", "Cancelled"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate("user", "name email phone");

  if (!order) return res.status(404).json({ message: "Order not found" });

  res.json(order);
});
router.get("/customers", async (req, res) => {
  const customers = await User.find({ role: "customer" })
    .select("-password")
    .sort({ createdAt: -1 });

  res.json(customers);
});

export default router;