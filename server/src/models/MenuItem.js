import mongoose from "mongoose";

const moneyField = { type: Number, default: 0, min: 0 };

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: moneyField,
    displayOrder: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const optionItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    priceDelta: moneyField,
    displayOrder: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true },
  },
  { _id: true }
);

const optionGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isRequired: { type: Boolean, default: false },
    selectionType: {
      type: String,
      enum: ["single", "multiple"],
      default: "single",
    },
    displayOrder: { type: Number, default: 0 },
    showAfterPreviousAnswered: { type: Boolean, default: true },
    isEnabled: { type: Boolean, default: true },
    options: [optionItemSchema],
  },
  { _id: true }
);

const menuItemSchema = new mongoose.Schema(
  {
    sourceKey: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, required: true, index: true },
    basePrice: moneyField,
    displayOrder: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true },
    variants: [variantSchema],
    optionGroups: [optionGroupSchema],
  },
  { timestamps: true }
);

export default mongoose.model("MenuItem", menuItemSchema);
