import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true },
  category: { type: String, default: "" },
  variant: { type: Object, default: null },
  selectedOptions: { type: Array, default: [] },
  pricingSnapshot: { type: Object, default: {} },
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    orderType: { type: String, enum: ["Collection", "Delivery"], required: true },
    address: { type: Object, default: null },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    deliveryArea: { type: String, default: "" },
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
    couponCode: { type: String, default: "" },
    discountSource: { type: String, default: "" },
    discountType: { type: String, default: "" },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },
    total: { type: Number, required: true },
    notes: { type: String, default: "" },

    scheduledFor: { type: Date, default: null },
    estimatedMinutes: { type: Number, default: null },
    estimatedReadyAt: { type: Date, default: null },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    paymentProvider: {
      type: String,
      default: "cash",
    },

    paymentMethod: { type: String, default: "cash" },
    transactionId: { type: String, default: "" },
    paypalOrderId: { type: String, default: "" },
    stripeSessionId: String,
    stripePaymentIntentId: String,

    status: {
      type: String,
      enum: [
        "Pending Payment",
        "Pending",
        "Accepted",
        "Preparing",
        "Ready",
        "Out for delivery",
        "Delivered",
        "Completed",
        "Cancelled",
      ],
      default: "Pending",
    },

    ownerCallStatus: {
      type: String,
      enum: ["not_sent", "processing", "sent", "failed", "skipped"],
      default: "not_sent",
      index: true,
    },
    ownerCallAttemptedAt: { type: Date, default: null },
    ownerCallSentAt: { type: Date, default: null },
    ownerCallSid: { type: String, default: "" },
    ownerCallError: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
