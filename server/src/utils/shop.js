// Helpers for shop opening status and delivery fee computation.
// All opening hours are interpreted in the Europe/London timezone so the
// shop status is correct regardless of where the server runs.

const TIMEZONE = "Europe/London";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getUkParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "long",
    hour12: false,
  }).formatToParts(date);

  const map = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  // Some locales return "24" instead of "00" for midnight.
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
    weekday: map.weekday.toLowerCase(),
  };
}

// Builds a Date whose UK local clock matches the given parts, handling DST.
function fromUkClock(year, month, day, hour, minute) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  // Inspect the UK clock of guess and adjust by the difference.
  const parts = getUkParts(guess);
  const intended =
    year * 527040 + (month - 1) * 44640 + day * 1440 + hour * 60 + minute;
  const actual =
    parts.year * 527040 +
    (parts.month - 1) * 44640 +
    parts.day * 1440 +
    parts.hour * 60 +
    parts.minute;
  const diffMinutes = intended - actual;
  guess = new Date(guess.getTime() + diffMinutes * 60000);
  return guess;
}

function parseHM(value) {
  if (!value || typeof value !== "string") return null;
  const [h, m] = value.split(":").map((part) => parseInt(part, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
}

// For a session starting on a given UK calendar day, return open/close as real Date objects.
function sessionWindow(sessionConfig, ukYear, ukMonth, ukDay) {
  if (!sessionConfig || sessionConfig.closed) return null;

  const openHM = parseHM(sessionConfig.open);
  const closeHM = parseHM(sessionConfig.close);
  if (!openHM || !closeHM) return null;

  const openDate = fromUkClock(ukYear, ukMonth, ukDay, openHM.h, openHM.m);

  // If close <= open (e.g. open 16:00, close 01:00 / 00:00), close rolls to next UK day.
  let closeUkDay = ukDay;
  let closeUkMonth = ukMonth;
  let closeUkYear = ukYear;
  if (
    closeHM.h < openHM.h ||
    (closeHM.h === openHM.h && closeHM.m <= openHM.m)
  ) {
    // Step to next calendar day via Date arithmetic in UTC, then read back UK parts.
    const nextDayUtc = new Date(Date.UTC(ukYear, ukMonth - 1, ukDay + 1, 12, 0, 0));
    const nextParts = getUkParts(nextDayUtc);
    closeUkYear = nextParts.year;
    closeUkMonth = nextParts.month;
    closeUkDay = nextParts.day;
  }

  const closeDate = fromUkClock(closeUkYear, closeUkMonth, closeUkDay, closeHM.h, closeHM.m);
  return { openDate, closeDate };
}

function ukDayKeyFor(date) {
  const parts = getUkParts(date);
  return parts.weekday; // already lowercased
}

export function getShopStatus(settings, now = new Date()) {
  const hours = settings?.openingHours || {};
  const nowParts = getUkParts(now);

  // Build candidates: yesterday (UK) and today (UK).
  const yesterdayUtc = new Date(now.getTime() - 24 * 3600 * 1000);
  const yParts = getUkParts(yesterdayUtc);

  const ySession = sessionWindow(hours[ukDayKeyFor(yesterdayUtc)], yParts.year, yParts.month, yParts.day);
  if (ySession && now >= ySession.openDate && now < ySession.closeDate) {
    return { isOpen: true, opensAt: ySession.openDate, closesAt: ySession.closeDate, nextOpenAt: null };
  }

  const tSession = sessionWindow(hours[ukDayKeyFor(now)], nowParts.year, nowParts.month, nowParts.day);
  if (tSession && now >= tSession.openDate && now < tSession.closeDate) {
    return { isOpen: true, opensAt: tSession.openDate, closesAt: tSession.closeDate, nextOpenAt: null };
  }

  // Find next opening within the next 8 days.
  for (let i = 0; i < 8; i++) {
    const probeUtc = new Date(now.getTime() + i * 24 * 3600 * 1000);
    const pParts = getUkParts(probeUtc);
    const session = sessionWindow(
      hours[ukDayKeyFor(probeUtc)],
      pParts.year,
      pParts.month,
      pParts.day
    );
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

  // Must fall within today's or yesterday's (UK) opening session.
  const hours = settings?.openingHours || {};
  const dParts = getUkParts(date);
  const todaySession = sessionWindow(hours[ukDayKeyFor(date)], dParts.year, dParts.month, dParts.day);

  const prevUtc = new Date(date.getTime() - 24 * 3600 * 1000);
  const pParts = getUkParts(prevUtc);
  const prevSession = sessionWindow(hours[ukDayKeyFor(prevUtc)], pParts.year, pParts.month, pParts.day);

  const inToday = todaySession && date >= todaySession.openDate && date < todaySession.closeDate;
  const inPrev = prevSession && date >= prevSession.openDate && date < prevSession.closeDate;

  if (!inToday && !inPrev) {
    return { valid: false, reason: "Scheduled time is outside our opening hours" };
  }

  return { valid: true };
}
