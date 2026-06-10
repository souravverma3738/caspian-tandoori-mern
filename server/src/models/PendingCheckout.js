import mongoose from "mongoose";

const pendingCheckoutSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stripeSessionId: { type: String, index: true },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    orderType: { type: String, enum: ["Collection", "Delivery"], required: true },
    address: { type: Object, default: null },
    items: { type: Array, default: [] },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    deliveryArea: { type: String, default: "" },
    total: { type: Number, required: true },
    notes: { type: String, default: "" },
    scheduledFor: { type: Date, default: null },
    status: {
      type: String,
      enum: ["created", "paid", "cancelled", "failed"],
      default: "created",
    },
    completedOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  },
  { timestamps: true }
);

export default mongoose.model("PendingCheckout", pendingCheckoutSchema);
