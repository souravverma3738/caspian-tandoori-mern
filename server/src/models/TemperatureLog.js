import mongoose from "mongoose";

const temperatureLogSchema = new mongoose.Schema(
  {
    area: {
      type: String,
      enum: [
        "Fridge",
        "Freezer",
        "Hot Holding",
        "Cooking",
        "Delivery Bag",
      ],
      required: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    temperature: {
      type: Number,
      required: true,
    },

    checkedBy: {
      type: String,
      required: true,
      trim: true,
    },

    signature: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },

    compliant: {
      type: Boolean,
      default: true,
    },

    alert: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TemperatureLog", temperatureLogSchema);