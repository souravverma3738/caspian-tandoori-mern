import express from "express";
import Order from "../models/Order.js";
import { auth } from "../middleware/auth.js";
import RestaurantSettings from "../models/RestaurantSettings.js";
import { quoteDelivery } from "../utils/shop.js";
import { calculateDiscount, calculateItemsSubtotal, incrementCouponUse } from "../services/discounts.js";

const router = express.Router();

router.post("/", auth, async (req, res) => {
  const { customerName, phone, orderType, address, items, notes, couponCode } = req.body;

  if (!customerName || !phone || !orderType || !items?.length) {
    return res.status(400).json({ message: "Missing required order details" });
  }

  let settings = await RestaurantSettings.findOne();
  if (!settings) settings = await RestaurantSettings.create({});

  const subtotal = calculateItemsSubtotal(items);
  let deliveryFee = 0;
  let deliveryArea = "";
  if (orderType === "Delivery") {
    const quote = quoteDelivery(settings, typeof address === "string" ? address : "");
    if (!quote.deliverable) {
      return res.status(400).json({ message: quote.message });
    }
    deliveryFee = Number(quote.fee || 0);
    deliveryArea = quote.area || "";
  }

  const discount = await calculateDiscount({
    couponCode,
    subtotal,
    userId: req.user._id,
  });
  const total = Math.max(0, Math.round((subtotal + deliveryFee - discount.discountAmount) * 100) / 100);

  const order = await Order.create({
    user: req.user._id,
    customerName,
    phone,
    orderType,
    address,
    items,
    subtotal,
    deliveryFee,
    deliveryArea,
    couponId: discount.coupon?._id || null,
    couponCode: discount.coupon?.code || "",
    discountSource: discount.source,
    discountType: discount.discountType,
    discountValue: discount.discountValue,
    discountAmount: discount.discountAmount,
    finalTotal: total,
    total,
    notes,
    paymentStatus: "Pending",
    paymentProvider: "cash",
    paymentMethod: "cash",
    status: "Pending",
  });
  await incrementCouponUse(discount.coupon?._id);

  res.status(201).json(order);
});

router.get("/my-orders", auth, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

export default router;
