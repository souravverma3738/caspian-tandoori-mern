import express from "express";
import RestaurantSettings from "../models/RestaurantSettings.js";
import Coupon from "../models/Coupon.js";
import { auth } from "../middleware/auth.js";
import { quoteDelivery } from "../utils/shop.js";
import { calculateDiscount, calculateItemsSubtotal } from "../services/discounts.js";
import { verifyAndPriceCartItems } from "../services/menuPricing.js";

const router = express.Router();

function formatAddressForQuote(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.line1, address.line2, address.city, address.postcode]
    .filter(Boolean)
    .join(", ");
}

router.get("/active-offer", async (req, res) => {
  try {
    const now = new Date();
    const offer = await Coupon.findOne({
      isWebsiteOffer: true,
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }] },
      ],
    }).sort({ createdAt: -1 });
    if (!offer) return res.json({ offer: null });
    res.json({
      offer: {
        title: offer.title,
        description: offer.description,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        minOrderAmount: offer.minOrderAmount,
        expiryDate: offer.expiryDate,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not load offer" });
  }
});

router.post("/validate", auth, async (req, res) => {
  try {
    const { code, items = [], orderType, address } = req.body;
    const verifiedItems = await verifyAndPriceCartItems(items);
    const subtotal = calculateItemsSubtotal(verifiedItems);

    let settings = await RestaurantSettings.findOne();
    if (!settings) settings = await RestaurantSettings.create({});

    let deliveryFee = 0;
    let deliveryArea = "";
    if (orderType === "Delivery") {
      const quote = quoteDelivery(settings, formatAddressForQuote(address));
      if (!quote.deliverable) {
        return res.status(400).json({ message: quote.message });
      }
      deliveryFee = Number(quote.fee || 0);
      deliveryArea = quote.area || "";
    }

    const discount = await calculateDiscount({
      couponCode: code,
      subtotal,
      userId: req.user._id,
    });
    const finalTotal = Math.max(0, Math.round((subtotal + deliveryFee - discount.discountAmount) * 100) / 100);

    res.json({
      message: discount.coupon ? "Coupon applied successfully." : "No discount applied.",
      code: discount.coupon?.code || "",
      label: discount.label,
      source: discount.source,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      discountAmount: discount.discountAmount,
      subtotal,
      deliveryFee,
      deliveryArea,
      finalTotal,
    });
  } catch (err) {
    res.status(400).json({ message: err.message || "Invalid coupon code" });
  }
});

export default router;
