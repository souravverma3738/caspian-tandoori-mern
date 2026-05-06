import express from "express";
import Stripe from "stripe";
import Order from "../models/Order.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();


router.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const { customerName, phone, orderType, address, items, total, notes } = req.body;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    if (!customerName || !phone || !items?.length || !total) {
      return res.status(400).json({ message: "Missing order details" });
    }

    const order = await Order.create({
      user: req.user._id,
      customerName,
      phone,
      orderType,
      address: orderType === "Delivery" ? address : null,
      items,
      total,
      notes,
      paymentStatus: "Pending",
      status: "Pending Payment",
      paymentProvider: "stripe",
    });

    const session = await stripe.checkout.sessions.create({
     ui_mode: "embedded_page",
      mode: "payment",
      payment_method_types: ["card"],
      line_items: items.map((item) => ({
        price_data: {
          currency: "gbp",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: item.qty,
      })),
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