import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function calculateItemsSubtotal(items = []) {
  return roundMoney(
    items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    )
  );
}

function dateValid(coupon, now = new Date()) {
  if (coupon.startDate && new Date(coupon.startDate) > now) return false;
  if (coupon.expiryDate && new Date(coupon.expiryDate) < now) return false;
  return true;
}

function dateError(coupon, now = new Date()) {
  if (coupon.startDate && new Date(coupon.startDate) > now) return "Coupon is not active yet";
  if (coupon.expiryDate && new Date(coupon.expiryDate) < now) return "Coupon expired";
  return null;
}

function discountAmountFor(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.discountType === "percentage") {
    return roundMoney(subtotal * (Number(coupon.discountValue || 0) / 100));
  }
  return roundMoney(Number(coupon.discountValue || 0));
}

async function assertCouponUsable(coupon, { subtotal, userId }) {
  if (!coupon) throw new Error("Invalid coupon code");
  if (!coupon.isActive) throw new Error("Coupon is inactive");

  const dateMessage = dateError(coupon);
  if (dateMessage) throw new Error(dateMessage);

  if (subtotal < Number(coupon.minOrderAmount || 0)) {
    throw new Error("Minimum order amount not reached");
  }

  if (coupon.usageLimit && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)) {
    throw new Error("Coupon usage limit reached");
  }

  if (coupon.perCustomerUsageLimit && userId) {
    const usedByCustomer = await Order.countDocuments({
      user: userId,
      couponId: coupon._id,
    });
    if (usedByCustomer >= Number(coupon.perCustomerUsageLimit)) {
      throw new Error("Coupon usage limit reached");
    }
  }
}

export async function getActiveWebsiteOffer(subtotal = 0) {
  const now = new Date();
  const offers = await Coupon.find({
    isWebsiteOffer: true,
    isActive: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }] },
    ],
  }).sort({ createdAt: -1 });

  return offers.find((offer) => subtotal >= Number(offer.minOrderAmount || 0)) || null;
}

export async function calculateDiscount({ couponCode, subtotal, userId }) {
  const cleanCode = String(couponCode || "").trim().toUpperCase();
  let coupon = null;
  let source = "none";

  if (cleanCode) {
    coupon = await Coupon.findOne({ code: cleanCode, isWebsiteOffer: { $ne: true } });
    await assertCouponUsable(coupon, { subtotal, userId });
    source = "coupon";
  } else {
    coupon = await getActiveWebsiteOffer(subtotal);
    if (coupon) {
      await assertCouponUsable(coupon, { subtotal, userId });
      source = "website_offer";
    }
  }

  if (!coupon) {
    return {
      coupon: null,
      source,
      discountAmount: 0,
      discountType: "",
      discountValue: 0,
      label: "",
    };
  }

  const rawDiscount = discountAmountFor(coupon, subtotal);
  const discountAmount = roundMoney(Math.min(rawDiscount, subtotal));

  return {
    coupon,
    source,
    discountAmount,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    label: coupon.isWebsiteOffer ? coupon.title || coupon.description || "Website offer" : coupon.code,
  };
}

export async function incrementCouponUse(couponId) {
  if (!couponId) return;
  await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
}

export function couponStatus(coupon) {
  if (!coupon.isActive) return "Inactive";
  if (!dateValid(coupon)) return "Expired";
  if (coupon.usageLimit && Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)) {
    return "Limit reached";
  }
  return "Active";
}
