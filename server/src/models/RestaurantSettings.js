import mongoose from "mongoose";

const restaurantSettingsSchema = new mongoose.Schema(
  {
    restaurantName: { type: String, default: "Caspian Tandoori" },
    logoUrl: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },

    openingHours: {
      monday: { type: String, default: "16:00 - 23:00" },
      tuesday: { type: String, default: "16:00 - 23:00" },
      wednesday: { type: String, default: "16:00 - 23:00" },
      thursday: { type: String, default: "16:00 - 23:00" },
      friday: { type: String, default: "16:00 - 23:30" },
      saturday: { type: String, default: "16:00 - 23:30" },
      sunday: { type: String, default: "16:00 - 23:00" },
    },

    deliveryZones: { type: String, default: "Local area within 3 miles" },
    deliveryFee: { type: Number, default: 2.5 },
    minimumOrder: { type: Number, default: 12 },

    stripePublicKey: { type: String, default: "" },
    stripeEnabled: { type: Boolean, default: true },

    vatRate: { type: Number, default: 20 },
    serviceCharge: { type: Number, default: 0 },

    smsEnabled: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },

    branchName: { type: String, default: "Main Branch" },
  },
  { timestamps: true }
);

export default mongoose.model("RestaurantSettings", restaurantSettingsSchema);