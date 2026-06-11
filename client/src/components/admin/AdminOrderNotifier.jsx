import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "../../api";
import { printOrderReceipt } from "./orderReceiptPrinter";

const ACK_KEY = "caspian_acknowledged_order_ids";
const SOUND_KEY = "caspian_admin_sound_enabled";
const ALERT_AUDIO = "/order-alert.wav";
const POLL_MS = 5000;

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function orderNumber(order) {
  return order?._id ? order._id.slice(-6).toUpperCase() : "";
}

function paymentMethodLabel(order) {
  const method = order.paymentMethod || order.paymentProvider || "cash";
  if (method === "stripe") return "Stripe";
  if (method === "paypal") return "PayPal";
  if (method === "cash") return "Cash / pay in store";
  return method;
}

function isPaidPendingOrder(order) {
  return order?.status === "Pending" && order?.paymentStatus === "Paid";
}

function addressLines(order) {
  if (!order?.address) return [];
  if (typeof order.address === "string") return [order.address];
  return [
    order.address.label,
    order.address.line1,
    order.address.line2,
    order.address.city,
    order.address.postcode,
    order.address.instructions,
  ].filter(Boolean);
}

function readAcknowledgedIds() {
  try {
    return JSON.parse(localStorage.getItem(ACK_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAcknowledgedIds(ids) {
  localStorage.setItem(ACK_KEY, JSON.stringify(Array.from(new Set(ids)).slice(-300)));
}

export default function AdminOrderNotifier({ onViewDetails }) {
  const [queue, setQueue] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem(SOUND_KEY) === "yes"
  );
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioRef = useRef(null);
  const knownIdsRef = useRef(new Set());
  const acknowledgedRef = useRef(new Set(readAcknowledgedIds()));
  const initialisedRef = useRef(false);
  const autoPrintedAcceptedIdsRef = useRef(new Set());
  const queueIds = useMemo(() => new Set(queue.map((order) => order._id)), [queue]);
  const activeOrder = queue[0];
  const waitingCount = Math.max(0, queue.length - 1);

  function stopSound() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  async function startSound() {
    if (!soundEnabled || !audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setSoundBlocked(false);
    } catch {
      setSoundBlocked(true);
    }
  }

  function acknowledge(orderId) {
    if (!orderId) return;
    acknowledgedRef.current.add(orderId);
    writeAcknowledgedIds(acknowledgedRef.current);
    setQueue((current) => current.filter((order) => order._id !== orderId));
  }

  async function fetchNewOrders() {
    try {
      const data = await adminApi.orders({ status: "Pending" });
      const pending = data.filter(isPaidPendingOrder);

      const fresh = pending
        .filter((order) => !initialisedRef.current || !knownIdsRef.current.has(order._id))
        .filter((order) => !acknowledgedRef.current.has(order._id))
        .filter((order) => !queueIds.has(order._id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (fresh.length) {
        setQueue((current) => [...fresh, ...current]);
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            const notification = new Notification("New order received", {
              body: `Order #${orderNumber(fresh[0])} - ${fresh[0].customerName} - ${money(fresh[0].total)}`,
              tag: `order-${fresh[0]._id}`,
              requireInteraction: true,
            });
            notification.onclick = () => {
              window.focus();
              onViewDetails?.(fresh[0]);
            };
          } catch {
            /* ignore browser notification failures */
          }
        }
      }

      knownIdsRef.current = new Set(pending.map((order) => order._id));
      initialisedRef.current = true;
    } catch (err) {
      console.error("Could not check new orders", err);
    }
  }

  useEffect(() => {
    const audio = new Audio(ALERT_AUDIO);
    audio.loop = true;
    audio.volume = 1;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    fetchNewOrders();
    const id = setInterval(fetchNewOrders, POLL_MS);
    const onFocus = () => fetchNewOrders();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [queueIds]);

  useEffect(() => {
    if (activeOrder) startSound();
    else stopSound();
  }, [activeOrder?._id, soundEnabled]);

  async function enableSound() {
    setSoundEnabled(true);
    localStorage.setItem(SOUND_KEY, "yes");
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    try {
      await audioRef.current?.play();
      if (!activeOrder) stopSound();
      setSoundBlocked(false);
    } catch {
      setSoundBlocked(true);
    }
  }

  async function acceptOrder() {
    if (!activeOrder) return;
    stopSound();
    const updated = await adminApi.updateOrderStatus(activeOrder._id, "Accepted");
    window.dispatchEvent(new CustomEvent("caspian-admin-order-updated", { detail: updated }));
    acknowledge(updated._id);
    if (!autoPrintedAcceptedIdsRef.current.has(updated._id)) {
      autoPrintedAcceptedIdsRef.current.add(updated._id);
      setTimeout(() => printOrderReceipt(updated), 0);
    }
  }

  async function rejectOrder() {
    if (!activeOrder) return;
    stopSound();
    const updated = await adminApi.updateOrderStatus(activeOrder._id, "Cancelled");
    window.dispatchEvent(new CustomEvent("caspian-admin-order-updated", { detail: updated }));
    acknowledge(updated._id);
  }

  function viewDetails() {
    if (!activeOrder) return;
    stopSound();
    acknowledge(activeOrder._id);
    onViewDetails?.(activeOrder);
  }

  if (!activeOrder) {
    return (
      <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-amber-200">
              Order sound
            </p>
            <p className="mt-1 text-sm text-white/65">
              Enable the loud order alert before service starts.
            </p>
          </div>
          <button
            onClick={enableSound}
            className={`rounded-full px-5 py-3 text-sm font-black ${
              soundEnabled
                ? "bg-emerald-500 text-white"
                : "bg-amber-400 text-black"
            }`}
          >
            {soundEnabled ? "Order sound enabled" : "Enable order sound"}
          </button>
        </div>
      </div>
    );
  }

  const lines = addressLines(activeOrder);
  const scheduledText = activeOrder.scheduledFor
    ? new Date(activeOrder.scheduledFor).toLocaleString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "ASAP";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border-4 border-amber-300 bg-[#100600] shadow-[0_0_70px_rgba(255,91,0,0.65)]">
        <div className="animate-pulse bg-red-600 px-6 py-5 text-center">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-yellow-100">
            New Order Received
          </p>
          <h2 className="mt-2 text-5xl font-black text-white md:text-7xl">
            ORDER #{orderNumber(activeOrder)}
          </h2>
          {waitingCount > 0 && (
            <p className="mt-2 text-lg font-black text-yellow-100">
              +{waitingCount} more new {waitingCount === 1 ? "order" : "orders"} waiting
            </p>
          )}
        </div>

        <div className="grid max-h-[72vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-xl border border-amber-300/35 bg-black/55 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Customer" value={activeOrder.customerName} />
              <Info label="Phone" value={activeOrder.phone} />
              <Info label="Order type" value={activeOrder.orderType} />
              <Info label="When" value={scheduledText} />
              <Info label="Total" value={money(activeOrder.total)} highlight />
              <Info label="Payment method" value={paymentMethodLabel(activeOrder)} />
              <Info label="Payment status" value={activeOrder.paymentStatus || "Pending"} />
            </div>

            {activeOrder.notes && (
              <div className="mt-5 rounded-xl border border-red-400/40 bg-red-500/15 p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-100">
                  Notes / allergies
                </p>
                <p className="mt-2 text-lg font-bold text-white">{activeOrder.notes}</p>
              </div>
            )}

            {activeOrder.orderType === "Delivery" && lines.length > 0 && (
              <div className="mt-5 rounded-xl border border-sky-400/40 bg-sky-500/15 p-4">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-100">
                  Delivery address
                </p>
                <div className="mt-2 text-lg font-bold leading-7 text-white">
                  {lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/15 bg-white p-5 text-black">
            <h3 className="text-2xl font-black">Items</h3>
            <div className="mt-4 grid gap-3">
              {activeOrder.items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex justify-between gap-4 border-b border-black/10 pb-3 text-lg"
                >
                  <div>
                    <p className="font-black">
                      {item.qty} x {item.name}
                    </p>
                    {item.category && (
                      <p className="text-sm font-bold text-black/45">{item.category}</p>
                    )}
                  </div>
                  <p className="font-black">{money(item.price * item.qty)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(!soundEnabled || soundBlocked) && (
          <div className="mx-5 mb-4 flex flex-col gap-3 rounded-xl border border-yellow-300 bg-yellow-100 p-3 font-black text-black sm:flex-row sm:items-center sm:justify-between">
            <span>
              {!soundEnabled
                ? "Order sound is not enabled yet. Click to allow the loud alarm."
                : "Browser blocked the alarm. Click Enable order sound or any action button."}
            </span>
            <button
              onClick={enableSound}
              className="rounded-full bg-black px-5 py-2 text-white"
            >
              Enable order sound
            </button>
          </div>
        )}

        <div className="grid gap-3 border-t border-amber-300/25 bg-black p-5 sm:grid-cols-4">
          <button onClick={acceptOrder} className="rounded-xl bg-emerald-500 px-5 py-4 text-lg font-black text-white">
            Accept Order
          </button>
          <button onClick={rejectOrder} className="rounded-xl bg-red-600 px-5 py-4 text-lg font-black text-white">
            Reject Order
          </button>
          <button onClick={viewDetails} className="rounded-xl bg-white px-5 py-4 text-lg font-black text-black">
            View Details
          </button>
          <button onClick={stopSound} className="rounded-xl border border-amber-300 px-5 py-4 text-lg font-black text-amber-100">
            Stop Sound
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, highlight = false }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>
      <p className={`mt-2 font-black ${highlight ? "text-4xl text-amber-300" : "text-2xl text-white"}`}>
        {value || "-"}
      </p>
    </div>
  );
}
