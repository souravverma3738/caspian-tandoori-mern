import express from "express";
import Stripe from "stripe";
import Order from "../models/Order.js";
import RestaurantSettings from "../models/RestaurantSettings.js";
import { auth } from "../middleware/auth.js";
import { getShopStatus, quoteDelivery, isScheduledTimeValid } from "../utils/shop.js";

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

    // 2. Server-side compute subtotal.
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );

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

    const total = Math.round((subtotal + deliveryFee) * 100) / 100;

    const order = await Order.create({
      user: req.user._id,
      customerName,
      phone,
      orderType,
      address: orderType === "Delivery" ? address : null,
      items,
      subtotal,
      deliveryFee,
      deliveryArea,
      total,
      notes,
      scheduledFor: normalizedScheduledFor,
      paymentStatus: "Pending",
      status: "Pending Payment",
      paymentProvider: "stripe",
    });

    const lineItems = items.map((item) => ({
      price_data: {
        currency: "gbp",
        product_data: { name: item.name },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.qty,
    }));

    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "gbp",
          product_data: { name: `Delivery to ${deliveryArea}` },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      metadata: {
        orderId: String(order._id),
        userId: String(req.user._id),
      },
      return_url: `${process.env.CLIENT_URL}/?checkout=return&session_id={CHECKOUT_SESSION_ID}`,
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.json({ clientSecret: session.client_secret, orderId: order._id });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not create payment" });
  }
});

export default router;
