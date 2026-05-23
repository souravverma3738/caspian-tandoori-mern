import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import StaffAttendance from "../models/StaffAttendance.js";
import TemperatureLog from "../models/TemperatureLog.js";
import RestaurantSettings from "../models/RestaurantSettings.js";

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

  const allowedStatuses = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Out for delivery",
  "Delivered",
  "Completed",
  "Cancelled"
]; if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid order status" });
  }

  const existing = await Order.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Order not found" });

  const update = { status };

  // Auto-calculate estimated ready time when the order is first accepted.
  if (status === "Accepted" && !existing.estimatedReadyAt) {
    let settings = await RestaurantSettings.findOne();
    if (!settings) settings = await RestaurantSettings.create({});
    const minutes = existing.orderType === "Delivery"
      ? Number(settings.defaultDeliveryMinutes || 45)
      : Number(settings.defaultPrepMinutes || 30);
    update.estimatedMinutes = minutes;
    update.estimatedReadyAt = new Date(Date.now() + minutes * 60 * 1000);
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true }
  ).populate("user", "name email phone");

  res.json(order);
});

router.patch("/orders/:id/estimate", async (req, res) => {
  const minutes = Number(req.body?.minutes);
  if (!minutes || minutes < 1 || minutes > 240) {
    return res.status(400).json({ message: "Estimated minutes must be between 1 and 240" });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      estimatedMinutes: minutes,
      estimatedReadyAt: new Date(Date.now() + minutes * 60 * 1000),
    },
    { new: true }
  ).populate("user", "name email phone");

  if (!order) return res.status(404).json({ message: "Order not found" });

  res.json(order);
});
router.get("/customers", async (req, res) => {
  const { search = "" } = req.query;

  const query = {
    role: { $ne: "admin" },
    ...(search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        }
      : {}),
  };

  const customers = await User.find(query)
    .select("-password")
    .sort({ createdAt: -1 });

  const customersWithStats = await Promise.all(
    customers.map(async (customer) => {
      const orders = await Order.find({ user: customer._id }).sort({
        createdAt: -1,
      });

      const totalSpent = orders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      return {
        ...customer.toObject(),
        orderCount: orders.length,
        totalSpent,
        orders,
      };
    })
  );

  res.json(customersWithStats);
});
router.get("/staff-attendance", async (req, res) => {
  const records = await StaffAttendance.find().sort({ createdAt: -1 });
  res.json(records);
});

router.post("/staff-attendance/clock-in", async (req, res) => {
  const { staffName, pin } = req.body;

  if (!staffName || !pin) {
    return res.status(400).json({ message: "Staff name and PIN are required" });
  }

  const activeRecord = await StaffAttendance.findOne({
    pin,
    status: { $ne: "Clocked Out" },
  });

  if (activeRecord) {
    return res.status(400).json({ message: "Staff member is already clocked in" });
  }

  const now = new Date();
  const lateTime = new Date();
  lateTime.setHours(17, 0, 0, 0);

  const record = await StaffAttendance.create({
    staffName,
    pin,
    clockIn: now,
    late: now > lateTime,
    status: "Clocked In",
  });

  res.status(201).json(record);
});

router.patch("/staff-attendance/:id/break-start", async (req, res) => {
  const record = await StaffAttendance.findByIdAndUpdate(
    req.params.id,
    {
      breakStart: new Date(),
      status: "On Break",
    },
    { new: true }
  );

  res.json(record);
});

router.patch("/staff-attendance/:id/break-end", async (req, res) => {
  const record = await StaffAttendance.findById(req.params.id);

  if (!record || !record.breakStart) {
    return res.status(400).json({ message: "No active break found" });
  }

  const now = new Date();
  const breakMinutes = Math.round((now - record.breakStart) / 60000);

  record.breakEnd = now;
  record.breakMinutes += breakMinutes;
  record.breakStart = null;
  record.status = "Clocked In";

  await record.save();
  res.json(record);
});

router.patch("/staff-attendance/:id/clock-out", async (req, res) => {
  const record = await StaffAttendance.findById(req.params.id);

  if (!record) {
    return res.status(404).json({ message: "Attendance record not found" });
  }

  const now = new Date();
  const totalMinutes = Math.max(
    0,
    Math.round((now - record.clockIn) / 60000) - Number(record.breakMinutes || 0)
  );

  record.clockOut = now;
  record.totalMinutes = totalMinutes;
  record.status = "Clocked Out";

  await record.save();
  res.json(record);
});
router.get("/temperature-logs", async (req, res) => {
  const logs = await TemperatureLog.find().sort({ createdAt: -1 });
  res.json(logs);
});

router.post("/temperature-logs", async (req, res) => {
  const {
    area,
    itemName,
    temperature,
    checkedBy,
    signature,
    notes,
  } = req.body;

  if (!area || !itemName || temperature === undefined || !checkedBy) {
    return res.status(400).json({
      message: "Missing required temperature fields",
    });
  }

  let compliant = true;
  let alert = false;

  // HACCP checks
  if (area === "Fridge" && temperature > 5) {
    compliant = false;
    alert = true;
  }

  if (area === "Freezer" && temperature > -18) {
    compliant = false;
    alert = true;
  }

  if (area === "Cooking" && temperature < 75) {
    compliant = false;
    alert = true;
  }

  if (area === "Hot Holding" && temperature < 63) {
    compliant = false;
    alert = true;
  }

  const log = await TemperatureLog.create({
    area,
    itemName,
    temperature,
    checkedBy,
    signature,
    notes,
    compliant,
    alert,
  });

  res.status(201).json(log);
});
router.get("/temperature-logs", async (req, res) => {
  const { area, startDate, endDate } = req.query;

  const query = {};

  if (area && area !== "All") {
    query.area = area;
  }

  if (startDate || endDate) {
    query.createdAt = {};

    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const logs = await TemperatureLog.find(query).sort({ createdAt: -1 });

  res.json(logs);
});
router.get("/settings", async (req, res) => {
  let settings = await RestaurantSettings.findOne();

  if (!settings) {
    settings = await RestaurantSettings.create({});
  }

  res.json(settings);
});

router.put("/settings", async (req, res) => {
  let settings = await RestaurantSettings.findOne();

  if (!settings) {
    settings = await RestaurantSettings.create(req.body);
  } else {
    settings = await RestaurantSettings.findByIdAndUpdate(
      settings._id,
      req.body,
      { new: true, runValidators: true }
    );
  }

  res.json(settings);
});
export default router;