import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true },
  category: { type: String, default: "" }
});

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    orderType: { type: String, enum: ["Collection", "Delivery"], required: true },
    address: { type: Object, default: null },
    items: [orderItemSchema],
    total: { type: Number, required: true },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "Accepted", "Preparing", "Ready", "Completed", "Cancelled"], default: "Pending" }
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
