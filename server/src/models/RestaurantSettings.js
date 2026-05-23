import mongoose from "mongoose";

const dayHoursSchema = new mongoose.Schema(
  {
    open: { type: String, default: "16:00" },
    close: { type: String, default: "23:00" },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const deliveryZoneSchema = new mongoose.Schema(
  {
    area: { type: String, required: true },
    fee: { type: Number, required: true },
    keywords: { type: [String], default: [] },
  },
  { _id: false }
);

const restaurantSettingsSchema = new mongoose.Schema(
  {
    restaurantName: { type: String, default: "Caspian Tandoori" },
    logoUrl: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },

    openingHours: {
      monday: { type: dayHoursSchema, default: () => ({ open: "16:00", close: "00:00", closed: false }) },
      tuesday: { type: dayHoursSchema, default: () => ({ open: "16:00", close: "00:00", closed: false }) },
      wednesday: { type: dayHoursSchema, default: () => ({ open: "16:00", close: "00:00", closed: false }) },
      thursday: { type: dayHoursSchema, default: () => ({ open: "16:00", close: "00:00", closed: false }) },
      friday: { type: dayHoursSchema, default: () => ({ open: "16:00", close: "01:00", closed: false }) },
      saturday: { type: dayHoursSchema, default: () => ({ open: "16:00", close: "01:00", closed: false }) },
      sunday: { type: dayHoursSchema, default: () => ({ open: "16:00", close: "00:00", closed: false }) },
    },

    acceptScheduledOrders: { type: Boolean, default: true },

    deliveryZones: {
      type: [deliveryZoneSchema],
      default: () => ([
        { area: "Cowdenbeath", fee: 3.5, keywords: ["cowdenbeath", "ky4 9"] },
        { area: "Kelty", fee: 3.0, keywords: ["kelty", "ky4 0"] },
        { area: "Kinross", fee: 6.5, keywords: ["kinross", "ky13"] },
        { area: "Lochgelly", fee: 6.5, keywords: ["lochgelly", "ky5 9"] },
        { area: "Ballingry", fee: 6.5, keywords: ["ballingry", "ky5 8"] },
        { area: "Cardenden", fee: 6.5, keywords: ["cardenden", "ky5 0"] },
      ]),
    },

    deliveryZonesText: { type: String, default: "Kelty, Cowdenbeath, Kinross, Lochgelly, Ballingry, Cardenden" },
    deliveryFee: { type: Number, default: 3.0 },
    minimumOrder: { type: Number, default: 0 },

    migrationVersion: { type: Number, default: 0 },

    defaultPrepMinutes: { type: Number, default: 30 },
    defaultDeliveryMinutes: { type: Number, default: 45 },

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
