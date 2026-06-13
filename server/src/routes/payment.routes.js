import express from "express";
import Stripe from "stripe";
import PendingCheckout from "../models/PendingCheckout.js";
import RestaurantSettings from "../models/RestaurantSettings.js";
import { auth } from "../middleware/auth.js";
import { getShopStatus, quoteDelivery, isScheduledTimeValid } from "../utils/shop.js";
import { createOrderFromPaidStripeSession } from "../services/stripeOrderConfirmation.js";
import { calculateDiscount, calculateItemsSubtotal } from "../services/discounts.js";
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

    // 1. Validate shop open or valid scheduled time.
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

    // 2. Server-side verify options and compute subtotal.
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

    // 3. Server-side compute delivery fee.
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
    if (finalTotal <= 0) {
      return res.status(400).json({ message: "Order total must be greater than £0 for online payment." });
    }

    const pendingCheckout = await PendingCheckout.create({
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
    });

    const lineItems = [
      {
        price_data: {
          currency: "gbp",
          product_data: { name: "Caspian Tandoori order" },
          unit_amount: Math.round(finalTotal * 100),
        },
        quantity: 1,
      },
    ];

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: {
        checkoutId: String(pendingCheckout._id),
        userId: String(req.user._id),
      },
      return_url: `${process.env.CLIENT_URL}/?checkout=return&session_id={CHECKOUT_SESSION_ID}`,
    });

    pendingCheckout.stripeSessionId = session.id;
    await pendingCheckout.save();

    res.json({
      clientSecret: session.client_secret,
      checkoutId: pendingCheckout._id,
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
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not create payment" });
  }
});

// Verify a Stripe Checkout session and update the order accordingly.
// Used as a fallback when the Stripe webhook is not configured, or to confirm
// payment immediately after the customer returns from Stripe.
router.get("/verify-session/:sessionId", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ message: "Missing session id" });

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
