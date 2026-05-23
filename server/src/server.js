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
app.use(express.json());

async function getOrCreateSettings() {
  let settings = await RestaurantSettings.findOne();
  if (!settings) {
    settings = await RestaurantSettings.create({});
    return settings;
  }

  // Migrate legacy data shape (string opening hours / string delivery zones).
  let needsSave = false;
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
  for (const day of dayKeys) {
    const value = settings.openingHours?.[day];
    if (!value || typeof value !== "object" || !value.open || !value.close) {
      settings.openingHours = settings.openingHours || {};
      settings.openingHours[day] = defaultHours[day];
      needsSave = true;
    }
  }

  if (!Array.isArray(settings.deliveryZones) || settings.deliveryZones.length === 0) {
    settings.deliveryZones = [
      { area: "Cowdenbeath", fee: 3.5, keywords: ["cowdenbeath", "ky4 9"] },
      { area: "Kelty", fee: 3.0, keywords: ["kelty", "ky4 0"] },
      { area: "Kinross", fee: 6.5, keywords: ["kinross", "ky13"] },
      { area: "Lochgelly", fee: 6.5, keywords: ["lochgelly", "ky5 9"] },
      { area: "Ballingry", fee: 6.5, keywords: ["ballingry", "ky5 8"] },
      { area: "Cardenden", fee: 6.5, keywords: ["cardenden", "ky5 0"] },
    ];
    needsSave = true;
  }

  if (needsSave) {
    settings.markModified("openingHours");
    settings.markModified("deliveryZones");
    await settings.save();
  }
  return settings;
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Caspian Tandoori API" });
});

app.get("/api/settings", async (req, res) => {
  const settings = await getOrCreateSettings();
  res.json(settings);
});

app.get("/api/settings/shop-status", async (req, res) => {
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
});

app.post("/api/settings/delivery-quote", async (req, res) => {
  const settings = await getOrCreateSettings();
  const quote = quoteDelivery(settings, req.body?.address || "");
  res.json({
    ...quote,
    minimumOrder: settings.minimumOrder || 0,
  });
});

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", stripeWebhookRoutes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientBuildPath = path.join(__dirname, "../../client/dist");

app.use(express.static(clientBuildPath));

app.get("/*splat", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});
