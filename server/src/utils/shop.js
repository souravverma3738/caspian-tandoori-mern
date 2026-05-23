// Helpers for shop opening status and delivery fee computation.

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getDayKey(date) {
  return DAY_KEYS[date.getDay()];
}

function parseHM(value) {
  if (!value || typeof value !== "string") return null;
  const [h, m] = value.split(":").map((part) => parseInt(part, 10));

  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

function sessionWindow(dayKey, sessionConfig, refDate) {
  if (!sessionConfig || sessionConfig.closed) return null;

  const openHM = parseHM(sessionConfig.open);
  const closeHM = parseHM(sessionConfig.close);
  if (!openHM || !closeHM) return null;

  const openDate = new Date(refDate);
  openDate.setHours(openHM.h, openHM.m, 0, 0);

  const closeDate = new Date(refDate);
  closeDate.setHours(closeHM.h, closeHM.m, 0, 0);

  // If close time is at/before open time, it rolls into the next day.
  if (closeDate <= openDate) {
    closeDate.setDate(closeDate.getDate() + 1);
  }

  return { dayKey, openDate, closeDate };
}

export function getShopStatus(settings, now = new Date()) {
  const hours = settings?.openingHours || {};

  // Check yesterday's session that may extend past midnight.
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const ySession = sessionWindow(getDayKey(yesterday), hours[getDayKey(yesterday)], yesterday);

  if (ySession && now >= ySession.openDate && now < ySession.closeDate) {
    return { isOpen: true, opensAt: ySession.openDate, closesAt: ySession.closeDate, nextOpenAt: null };
  }

  // Check today's session.
  const tSession = sessionWindow(getDayKey(now), hours[getDayKey(now)], now);
  if (tSession && now >= tSession.openDate && now < tSession.closeDate) {
    return { isOpen: true, opensAt: tSession.openDate, closesAt: tSession.closeDate, nextOpenAt: null };
  }

  // Find next opening in the next 8 days.
  for (let i = 0; i < 8; i++) {
    const probe = new Date(now);
    probe.setDate(probe.getDate() + i);
    const session = sessionWindow(getDayKey(probe), hours[getDayKey(probe)], probe);
    if (session && session.openDate > now) {
      return { isOpen: false, opensAt: null, closesAt: null, nextOpenAt: session.openDate };
    }
  }

  return { isOpen: false, opensAt: null, closesAt: null, nextOpenAt: null };
}

export function quoteDelivery(settings, addressInput) {
  const zones = settings?.deliveryZones || [];
  if (!addressInput || typeof addressInput !== "string") {
    return { deliverable: false, area: "", fee: 0, message: "Please enter your full delivery address." };
  }

  const cleaned = addressInput.toLowerCase().replace(/[^a-z0-9 ]+/g, " ");

  for (const zone of zones) {
    const keywords = (zone.keywords || []).map((k) => k.toLowerCase());
    if (keywords.some((kw) => cleaned.includes(kw))) {
      return { deliverable: true, area: zone.area, fee: Number(zone.fee || 0), message: "" };
    }
  }

  const zoneNames = zones.map((z) => z.area).join(", ");
  return {
    deliverable: false,
    area: "",
    fee: 0,
    message: zoneNames
      ? `Sorry, we only deliver to: ${zoneNames}. Please include the town name in your address.`
      : "Delivery is not available right now.",
  };
}

export function isScheduledTimeValid(settings, scheduledAt) {
  if (!scheduledAt) return { valid: false, reason: "No scheduled time provided" };
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return { valid: false, reason: "Invalid scheduled time" };

  const now = new Date();
  if (date.getTime() < now.getTime() + 15 * 60 * 1000) {
    return { valid: false, reason: "Scheduled time must be at least 15 minutes from now" };
  }

  // Must fall within an opening session within next 7 days.
  const hours = settings?.openingHours || {};
  const dayKey = getDayKey(date);
  const session = sessionWindow(dayKey, hours[dayKey], date);

  // Also check previous day's session that may roll over.
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  const prevSession = sessionWindow(getDayKey(prev), hours[getDayKey(prev)], prev);

  const inToday = session && date >= session.openDate && date < session.closeDate;
  const inPrev = prevSession && date >= prevSession.openDate && date < prevSession.closeDate;

  if (!inToday && !inPrev) {
    return { valid: false, reason: "Scheduled time is outside our opening hours" };
  }

  return { valid: true };
}
