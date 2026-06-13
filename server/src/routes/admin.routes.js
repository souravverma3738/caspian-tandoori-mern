import express from "express";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import { adminOnly } from "../middleware/admin.js";
import StaffAttendance from "../models/StaffAttendance.js";
import TemperatureLog from "../models/TemperatureLog.js";
import RestaurantSettings from "../models/RestaurantSettings.js";
import Coupon from "../models/Coupon.js";
import { couponStatus } from "../services/discounts.js";
import MenuItem from "../models/MenuItem.js";
import { ensureDefaultMenu } from "../services/menuPricing.js";

const router = express.Router();

router.use(auth);
router.use(adminOnly);

router.get("/menu", async (req, res) => {
  await ensureDefaultMenu();
  const items = await MenuItem.find().sort({ displayOrder: 1, category: 1, name: 1 });
  res.json(items);
});

router.post("/menu", async (req, res) => {
  try {
    const payload = normaliseMenuItemPayload(req.body);
    const sourceKey = payload.sourceKey || `${Date.now()}-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const item = await MenuItem.create({ ...payload, sourceKey });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not create menu item" });
  }
});

router.put("/menu/:id", async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(
      req.params.id,
      normaliseMenuItemPayload(req.body),
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Menu item not found" });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not update menu item" });
  }
});

router.delete("/menu/:id", async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Menu item not found" });
  res.json({ ok: true });
});

function numberOrZero(value, fieldName = "Price") {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  if (n > 500) {
    throw new Error(`${fieldName} looks too high. Please enter the amount in pounds, for example 7.00.`);
  }
  return Math.max(0, Math.round(n * 100) / 100);
}

function normaliseMenuItemPayload(body) {
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  if (!name) throw new Error("Item name is required");
  if (!category) throw new Error("Category is required");

  return {
    sourceKey: body.sourceKey,
    name,
    category,
    description: String(body.description || "").trim(),
    basePrice: numberOrZero(body.basePrice, "Base price"),
    displayOrder: Number(body.displayOrder || 0),
    isEnabled: body.isEnabled !== false,
    variants: Array.isArray(body.variants)
      ? body.variants.map((variant, index) => ({
          _id: variant._id,
          name: String(variant.name || "").trim(),
          price: numberOrZero(variant.price, `Size price for ${variant.name || "variant"}`),
          displayOrder: Number(variant.displayOrder ?? index),
          isEnabled: variant.isEnabled !== false,
        })).filter((variant) => variant.name)
      : [],
    optionGroups: Array.isArray(body.optionGroups)
      ? body.optionGroups.map((group, groupIndex) => ({
          _id: group._id,
          name: String(group.name || "").trim(),
          isRequired: Boolean(group.isRequired),
          selectionType: group.selectionType === "multiple" ? "multiple" : "single",
          displayOrder: Number(group.displayOrder ?? groupIndex),
          showAfterPreviousAnswered: group.showAfterPreviousAnswered !== false,
          isEnabled: group.isEnabled !== false,
          options: Array.isArray(group.options)
            ? group.options.map((option, optionIndex) => ({
                _id: option._id,
                name: String(option.name || "").trim(),
                priceDelta: numberOrZero(option.priceDelta, `Extra price for ${option.name || "option"}`),
                displayOrder: Number(option.displayOrder ?? optionIndex),
                isEnabled: option.isEnabled !== false,
              })).filter((option) => option.name)
            : [],
        })).filter((group) => group.name)
      : [],
  };
}

router.get("/dashboard", async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const visibleOrderQuery = {
    status: { $ne: "Pending Payment" },
    $or: [
      { paymentProvider: { $ne: "stripe" } },
      { paymentStatus: "Paid" },
    ],
  };
   const ordersToday = await Order.find({ ...visibleOrderQuery, createdAt: { $gte: startOfDay } });
  const allOrders = await Order.find(visibleOrderQuery);
  const totalCustomers = await User.countDocuments({ role: "customer" });
  const pendingOrders = await Order.countDocuments({ ...visibleOrderQuery, status: "Pending" });
  const completedOrders = await Order.countDocuments({ ...visibleOrderQuery, status: "Completed" });

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

  const query = {
    status: { $ne: "Pending Payment" },
    $or: [
      { paymentProvider: { $ne: "stripe" } },
      { paymentStatus: "Paid" },
    ],
  };
  if (status && status !== "all") {
    query.status = status === "Pending Payment" ? "__hidden__" : status;
  }

  if (search) {
    query.$and = [
      {
        $or: [
      { customerName: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } }
        ],
      },
    ];
  }

  const orders = await Order.find(query)
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });

  res.json(orders);
});

router.get("/coupons", async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json(coupons.map((coupon) => ({ ...coupon.toObject(), statusLabel: couponStatus(coupon) })));
});

router.post("/coupons", async (req, res) => {
  try {
    const payload = normaliseCouponPayload(req.body);
    const coupon = await Coupon.create(payload);
    res.status(201).json({ ...coupon.toObject(), statusLabel: couponStatus(coupon) });
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not create coupon" });
  }
});

router.put("/coupons/:id", async (req, res) => {
  try {
    const payload = normaliseCouponPayload(req.body);
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ ...coupon.toObject(), statusLabel: couponStatus(coupon) });
  } catch (err) {
    res.status(400).json({ message: err.message || "Could not update coupon" });
  }
});

router.patch("/coupons/:id/deactivate", async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  res.json({ ...coupon.toObject(), statusLabel: couponStatus(coupon) });
});

router.delete("/coupons/:id", async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) return res.status(404).json({ message: "Coupon not found" });
  res.json({ ok: true });
});

function normaliseCouponPayload(body) {
  const isWebsiteOffer = Boolean(body.isWebsiteOffer);
  const code = isWebsiteOffer ? "" : String(body.code || "").trim().toUpperCase();
  if (!isWebsiteOffer && !code) throw new Error("Coupon code is required");
  if (!["percentage", "fixed"].includes(body.discountType)) {
    throw new Error("Discount type must be percentage or fixed");
  }
  const discountValue = Number(body.discountValue);
  if (!discountValue || discountValue <= 0) throw new Error("Discount value must be greater than 0");
  if (body.discountType === "percentage" && discountValue > 100) {
    throw new Error("Percentage discount cannot exceed 100");
  }

  return {
    code,
    title: String(body.title || "").trim(),
    description: String(body.description || "").trim(),
    discountType: body.discountType,
    discountValue,
    minOrderAmount: Number(body.minOrderAmount || 0),
    startDate: body.startDate ? new Date(body.startDate) : null,
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
    usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
    perCustomerUsageLimit: body.perCustomerUsageLimit ? Number(body.perCustomerUsageLimit) : null,
    isActive: body.isActive !== false,
    isWebsiteOffer,
  };
}
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
