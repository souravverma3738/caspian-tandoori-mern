import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import orderRoutes from "./routes/order.routes.js";
import path from "path";
import adminRoutes from "./routes/admin.routes.js";
import { fileURLToPath } from "url";
import paymentRoutes from "./routes/payment.routes.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.routes.js";
import RestaurantSettings from "./models/RestaurantSettings.js";
import { getShopStatus, quoteDelivery } from "./utils/shop.js";

connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use("/api/webhooks", stripeWebhookRoutes);
app.use(express.json());

async function getOrCreateSettings() {
  const Collection = RestaurantSettings.collection;
  let settings = await RestaurantSettings.findOne();
  if (!settings) {
    settings = await RestaurantSettings.create({});
    return settings;
  }

  const dayKeys = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const defaultHours = {
    monday: { open: "16:00", close: "00:00", closed: false },
    tuesday: { open: "16:00", close: "00:00", closed: false },
    wednesday: { open: "16:00", close: "00:00", closed: false },
    thursday: { open: "16:00", close: "00:00", closed: false },
    friday: { open: "16:00", close: "01:00", closed: false },
    saturday: { open: "16:00", close: "01:00", closed: false },
    sunday: { open: "16:00", close: "00:00", closed: false },
  };
  const defaultZones = [
    { area: "Cowdenbeath", fee: 3.5, keywords: ["cowdenbeath", "ky4 9"] },
    { area: "Kelty", fee: 3.0, keywords: ["kelty", "ky4 0"] },
    { area: "Kinross", fee: 6.5, keywords: ["kinross", "ky13"] },
    { area: "Lochgelly", fee: 6.5, keywords: ["lochgelly", "ky5 9"] },
    { area: "Ballingry", fee: 6.5, keywords: ["ballingry", "ky5 8"] },
    { area: "Cardenden", fee: 6.5, keywords: ["cardenden", "ky5 0"] },
  ];

  // Read the raw document (bypassing Mongoose casting) so we can detect legacy shapes.
  const raw = await Collection.findOne({ _id: settings._id });

  const ohBroken =
    !raw?.openingHours ||
    typeof raw.openingHours !== "object" ||
    dayKeys.some((d) => {
      const v = raw.openingHours?.[d];
      return !v || typeof v !== "object" || !v.open || !v.close;
    });

  const dzBroken =
    !Array.isArray(raw?.deliveryZones) ||
    raw.deliveryZones.length === 0 ||
    typeof raw.deliveryZones[0] !== "object" ||
    !raw.deliveryZones[0].area;

  const v1Needed = (raw?.migrationVersion || 0) < 1;

  if (ohBroken || dzBroken || v1Needed) {
    const updates = {};
    if (ohBroken) updates.openingHours = defaultHours;
    if (dzBroken) updates.deliveryZones = defaultZones;
    if (v1Needed) {
      updates.minimumOrder = 0;
      updates.migrationVersion = 1;
    }

    // Use the native driver to bypass Mongoose casting rejections.
    await Collection.updateOne({ _id: settings._id }, { $set: updates });
    settings = await RestaurantSettings.findOne();
  }

  return settings;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Caspian Tandoori API" });
});

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    console.error("[GET /api/settings] failed:", err);
    res.status(500).json({ message: err.message || "Could not load settings" });
  }
});

app.get("/api/settings/shop-status", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const status = getShopStatus(settings);
    res.json({
      isOpen: status.isOpen,
      opensAt: status.opensAt,
      closesAt: status.closesAt,
      nextOpenAt: status.nextOpenAt,
      acceptScheduledOrders: settings.acceptScheduledOrders,
      openingHours: settings.openingHours,
      serverTime: new Date(),
    });
  } catch (err) {
    console.error("[GET /api/settings/shop-status] failed:", err);
    // Safe fallback so the front-end keeps working even if settings are broken.
    res.json({
      isOpen: false,
      opensAt: null,
      closesAt: null,
      nextOpenAt: null,
      acceptScheduledOrders: true,
      openingHours: {},
      serverTime: new Date(),
      error: err.message,
    });
  }
});

app.post("/api/settings/delivery-quote", async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const quote = quoteDelivery(settings, req.body?.address || "");
    res.json({
      ...quote,
      minimumOrder: settings.minimumOrder || 0,
    });
  } catch (err) {
    console.error("[POST /api/settings/delivery-quote] failed:", err);
    res.status(500).json({ message: err.message || "Could not get delivery quote" });
  }
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientBuildPath = path.join(__dirname, "../../client/dist");

app.use(express.static(clientBuildPath));

app.get("/*splat", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});
