import express from "express";
import Stripe from "stripe";
import PendingCheckout from "../models/PendingCheckout.js";
import Order from "../models/Order.js";
import RestaurantSettings from "../models/RestaurantSettings.js";
import { auth } from "../middleware/auth.js";
import { getShopStatus, quoteDelivery, isScheduledTimeValid } from "../utils/shop.js";
import { createOrderFromPaidStripeSession } from "../services/stripeOrderConfirmation.js";
import { calculateDiscount, calculateItemsSubtotal, incrementCouponUse } from "../services/discounts.js";
import { verifyAndPriceCartItems } from "../services/menuPricing.js";

const router = express.Router();

function formatAddressForQuote(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.line1, address.line2, address.city, address.postcode]
    .filter(Boolean)
    .join(", ");
}

router.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const {
      customerName,
      phone,
      orderType,
      address,
      items,
      notes,
      scheduledFor,
      couponCode,
    } = req.body;

    if (!customerName || !phone || !items?.length) {
      return res.status(400).json({ message: "Missing order details" });
    }

    let settings = await RestaurantSettings.findOne();
    if (!settings) settings = await RestaurantSettings.create({});

    const shopStatus = getShopStatus(settings);
    let normalizedScheduledFor = null;

    if (!shopStatus.isOpen) {
      if (!settings.acceptScheduledOrders) {
        return res.status(400).json({
          message: "Sorry, we are currently closed and not accepting scheduled orders.",
        });
      }
      if (!scheduledFor) {
        return res.status(400).json({
          message: shopStatus.nextOpenAt
            ? `We are currently closed. Please schedule your order for after ${new Date(shopStatus.nextOpenAt).toLocaleString("en-GB")}.`
            : "We are currently closed. Please choose a later time to schedule your order.",
        });
      }
      const check = isScheduledTimeValid(settings, scheduledFor);
      if (!check.valid) {
        return res.status(400).json({ message: check.reason });
      }
      normalizedScheduledFor = new Date(scheduledFor);
    } else if (scheduledFor) {
      const check = isScheduledTimeValid(settings, scheduledFor);
      if (check.valid) {
        normalizedScheduledFor = new Date(scheduledFor);
      }
    }

    let verifiedItems;
    try {
      verifiedItems = await verifyAndPriceCartItems(items);
    } catch (err) {
      return res.status(400).json({ message: err.message || "Invalid basket" });
    }
    const subtotal = calculateItemsSubtotal(verifiedItems);

    if (subtotal < Number(settings.minimumOrder || 0) && orderType === "Delivery") {
      return res.status(400).json({
        message: `Minimum delivery order is £${Number(settings.minimumOrder).toFixed(2)}.`,
      });
    }

    let deliveryFee = 0;
    let deliveryArea = "";
    if (orderType === "Delivery") {
      const quote = quoteDelivery(settings, formatAddressForQuote(address));
      if (!quote.deliverable) {
        return res.status(400).json({ message: quote.message });
      }
      deliveryFee = Number(quote.fee || 0);
      deliveryArea = quote.area;
    }

    const discount = await calculateDiscount({
      couponCode,
      subtotal,
      userId: req.user._id,
    });
    const totalBeforeDiscount = Math.round((subtotal + deliveryFee) * 100) / 100;
    const finalTotal = Math.max(
      0,
      Math.round((totalBeforeDiscount - discount.discountAmount) * 100) / 100
    );

    const order = await Order.create({
      user: req.user._id,
      customerName,
      phone,
      orderType,
      address: orderType === "Delivery" ? address : null,
      items: verifiedItems,
      subtotal,
      deliveryFee,
      deliveryArea,
      couponId: discount.coupon?._id || null,
      couponCode: discount.coupon?.code || "",
      discountSource: discount.source,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      discountAmount: discount.discountAmount,
      finalTotal,
      total: finalTotal,
      notes,
      scheduledFor: normalizedScheduledFor,
      paymentStatus: "Pending",
      paymentProvider: "pay_later",
      paymentMethod: "pay_later",
      status: "Pending",
    });
    await incrementCouponUse(discount.coupon?._id);

    res.json({
      clientSecret: "pay_later",
      checkoutId: order._id,
      payLater: true,
      orderId: order._id,
      summary: {
        items: verifiedItems,
        subtotal,
        deliveryFee,
        deliveryArea,
        discountLabel: discount.label,
        discountSource: discount.source,
        couponCode: discount.coupon?.code || "",
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        discountAmount: discount.discountAmount,
        finalTotal,
        orderId: order._id,
        paymentMethod: "Pay later",
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not create order" });
  }
});

router.get("/verify-session/:sessionId", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ message: "Missing session id" });

    if (sessionId === "pay_later") {
      return res.json({
        paymentStatus: "Pending",
        checkoutStatus: "pay_later",
        status: "Pending",
        orderId: null,
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    let result = { order: null };
    if (session.payment_status === "paid") {
      result = await createOrderFromPaidStripeSession(session);
    } else if (session.status === "expired" || session.payment_status === "unpaid") {
      await PendingCheckout.findOneAndUpdate(
        { stripeSessionId: sessionId },
        { status: session.status === "expired" ? "cancelled" : "failed" }
      );
    }

    res.json({
      paymentStatus: session.payment_status === "paid" ? "Paid" : "Pending",
      checkoutStatus: session.status,
      status: result.order?.status || null,
      orderId: result.order?._id || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not verify payment" });
  }
});

export default router;
