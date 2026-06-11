import Order from "../models/Order.js";
import PendingCheckout from "../models/PendingCheckout.js";
import { incrementCouponUse } from "./discounts.js";

function pennies(value) {
  return Math.round(Number(value || 0) * 100);
}

export async function createOrderFromPaidStripeSession(session) {
  if (!session || session.payment_status !== "paid") {
    return { order: null, created: false, reason: "not_paid" };
  }

  const existing = await Order.findOne({ stripeSessionId: session.id });
  if (existing) return { order: existing, created: false, reason: "already_created" };

  const pending = await PendingCheckout.findOne({
    $or: [
      { stripeSessionId: session.id },
      { _id: session.metadata?.checkoutId },
    ],
  });

  if (!pending) {
    return { order: null, created: false, reason: "pending_checkout_not_found" };
  }

  if (Number(session.amount_total || 0) !== pennies(pending.total)) {
    pending.status = "failed";
    await pending.save();
    throw new Error("Paid amount does not match the pending checkout total");
  }

  const order = await Order.create({
    user: pending.user,
    customerName: pending.customerName,
    phone: pending.phone,
    orderType: pending.orderType,
    address: pending.orderType === "Delivery" ? pending.address : null,
    items: pending.items,
    subtotal: pending.subtotal,
    deliveryFee: pending.deliveryFee,
    deliveryArea: pending.deliveryArea,
    couponId: pending.couponId,
    couponCode: pending.couponCode,
    discountSource: pending.discountSource,
    discountType: pending.discountType,
    discountValue: pending.discountValue,
    discountAmount: pending.discountAmount,
    finalTotal: pending.finalTotal,
    total: pending.total,
    notes: pending.notes,
    scheduledFor: pending.scheduledFor,
    paymentStatus: "Paid",
    paymentProvider: "stripe",
    paymentMethod: "stripe",
    transactionId: session.payment_intent ? String(session.payment_intent) : "",
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent ? String(session.payment_intent) : "",
    status: "Pending",
  });

  pending.status = "paid";
  pending.completedOrder = order._id;
  await pending.save();
  await incrementCouponUse(pending.couponId);

  return { order, created: true, reason: "created" };
}
