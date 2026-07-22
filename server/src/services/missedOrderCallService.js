import twilio from "twilio";
import Order from "../models/Order.js";

let timer = null;
let checkInProgress = false;

function isEnabled() {
  return String(process.env.ORDER_CALL_ENABLED || "false").toLowerCase() === "true";
}

function getPositiveNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function hasRequiredConfig() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER &&
      process.env.OWNER_PHONE_NUMBER
  );
}

function eligiblePaymentQuery() {
  return {
    $or: [
      { paymentStatus: "Paid" },
      { paymentMethod: { $in: ["cash", "pay_later"] } },
      { paymentProvider: { $in: ["cash", "pay_later"] } },
    ],
  };
}

function buildCallMessage(order) {
  const orderNumber = String(order._id).slice(-6).toUpperCase();
  const total = Number(order.total || order.finalTotal || 0).toFixed(2);
  return `Caspian Tandoori alert. Order ${orderNumber} from ${order.customerName} has not been accepted. The order total is ${total} pounds. Please open the admin panel and accept the order.`;
}

async function claimNextMissedOrder() {
  const delayMinutes = getPositiveNumber("ORDER_CALL_DELAY_MINUTES", 2);
  const cutoff = new Date(Date.now() - delayMinutes * 60 * 1000);
  const now = new Date();

  return Order.findOneAndUpdate(
    {
      status: "Pending",
      createdAt: { $lte: cutoff },
      ownerCallStatus: "not_sent",
      $and: [
        eligiblePaymentQuery(),
        {
          $or: [
            { scheduledFor: null },
            { scheduledFor: { $lte: now } },
          ],
        },
      ],
    },
    {
      $set: {
        ownerCallStatus: "processing",
        ownerCallAttemptedAt: new Date(),
        ownerCallError: "",
      },
    },
    {
      new: true,
      sort: { createdAt: 1 },
    }
  );
}

async function placeOwnerCall(order) {
  const latestOrder = await Order.findById(order._id).select("status ownerCallStatus");
  if (!latestOrder || latestOrder.status !== "Pending") {
    await Order.updateOne(
      { _id: order._id, ownerCallStatus: "processing" },
      { $set: { ownerCallStatus: "skipped", ownerCallError: "Order no longer pending" } }
    );
    return;
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const message = buildCallMessage(order);
  const twiml = `<Response><Say voice="Polly.Amy" language="en-GB">${message}</Say><Pause length="1"/><Say voice="Polly.Amy" language="en-GB">Please check the admin panel now.</Say></Response>`;

  try {
    const call = await client.calls.create({
      to: process.env.OWNER_PHONE_NUMBER,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml,
    });

    await Order.updateOne(
      { _id: order._id, ownerCallStatus: "processing" },
      {
        $set: {
          ownerCallStatus: "sent",
          ownerCallSentAt: new Date(),
          ownerCallSid: call.sid || "",
          ownerCallError: "",
        },
      }
    );

    console.log(`[missed-order-call] Called owner for order ${order._id}`);
  } catch (error) {
    await Order.updateOne(
      { _id: order._id, ownerCallStatus: "processing" },
      {
        $set: {
          ownerCallStatus: "failed",
          ownerCallError: String(error?.message || error).slice(0, 500),
        },
      }
    );

    console.error(`[missed-order-call] Call failed for order ${order._id}:`, error?.message || error);
  }
}

async function checkMissedOrders() {
  if (checkInProgress) return;
  checkInProgress = true;

  try {
    for (let count = 0; count < 10; count += 1) {
      const order = await claimNextMissedOrder();
      if (!order) break;
      await placeOwnerCall(order);
    }
  } catch (error) {
    console.error("[missed-order-call] Checker failed:", error?.message || error);
  } finally {
    checkInProgress = false;
  }
}

export function startMissedOrderCallService() {
  if (!isEnabled()) {
    console.log("[missed-order-call] Disabled. Set ORDER_CALL_ENABLED=true after adding real credentials.");
    return;
  }

  if (!hasRequiredConfig()) {
    console.error("[missed-order-call] Not started because Twilio or owner phone settings are missing.");
    return;
  }

  const intervalSeconds = getPositiveNumber("ORDER_CALL_CHECK_INTERVAL_SECONDS", 30);
  console.log(`[missed-order-call] Started; checking every ${intervalSeconds} seconds.`);

  checkMissedOrders();
  timer = setInterval(checkMissedOrders, intervalSeconds * 1000);
  timer.unref?.();
}

export function stopMissedOrderCallService() {
  if (timer) clearInterval(timer);
  timer = null;
}
