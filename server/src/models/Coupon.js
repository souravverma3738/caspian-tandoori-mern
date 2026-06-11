import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, uppercase: true, index: true },
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    perCustomerUsageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isWebsiteOffer: { type: Boolean, default: false },
  },
  { timestamps: true }
);

couponSchema.pre("save", function normaliseCode() {
  if (this.code) this.code = this.code.trim().toUpperCase();
});

export default mongoose.model("Coupon", couponSchema);
