import { useEffect, useRef, useState } from "react";
import { adminApi, paymentApi } from "../../api";

const statuses = [
  "all",
  "Pending Payment",
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Out for delivery",
  "Delivered",
  "Completed",
  "Cancelled",
];

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function formatOrderTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function timeAgo(dateString) {
  if (!dateString) return "";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

// Tiny chime synthesised with WebAudio so we don't need any audio file.
function createRingtone() {
  let ctx = null;
  function play() {
    try {
      if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        ctx = new AudioCtx();
      }
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      [0, 0.55, 1.1].forEach((offset) => {
        [880, 1320].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          const start = now + offset + i * 0.18;
          g.gain.setValueAtTime(0.0001, start);
          g.gain.exponentialRampToValueAtTime(0.5, start + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
          o.start(start);
          o.stop(start + 0.4);
        });
      });
    } catch (err) {
      console.warn("Ringtone failed", err);
    }
  }
  return { play };
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soundOn, setSoundOn] = useState(() => {
    return localStorage.getItem("caspian_admin_sound") !== "off";
  });
  const [newOrderFlash, setNewOrderFlash] = useState(0);
  const ringtoneRef = useRef(null);
  const knownOrderIdsRef = useRef(new Set());
  const initialisedRef = useRef(false);
  const continuousRingRef = useRef(null);

  if (!ringtoneRef.current) ringtoneRef.current = createRingtone();

  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === "Pending").length;
    if (continuousRingRef.current) {
      clearInterval(continuousRingRef.current);
      continuousRingRef.current = null;
    }
    if (pendingCount > 0 && soundOn) {
      continuousRingRef.current = setInterval(() => {
        ringtoneRef.current.play();
      }, 8000);
    }
    return () => {
      if (continuousRingRef.current) clearInterval(continuousRingRef.current);
    };
  }, [orders, soundOn]);

  async function loadOrders({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      setError("");
      const data = await adminApi.orders({ status, search });

      if (initialisedRef.current) {
        const newPending = data.filter(
          (order) =>
            order.status === "Pending" && !knownOrderIdsRef.current.has(order._id)
        );
        if (newPending.length > 0) {
          if (soundOn) ringtoneRef.current.play();
          setNewOrderFlash(newPending.length);
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("New order received!", {
                body: `${newPending[0].customerName} · £${Number(newPending[0].total).toFixed(2)}`,
              });
            } catch {
              /* ignore */
            }
          }
          setTimeout(() => setNewOrderFlash(0), 8000);
        }
      }

      knownOrderIdsRef.current = new Set(data.map((order) => order._id));
      initialisedRef.current = true;
      setOrders(data);
    } catch (err) {
      setError(err.message || "Could not load orders");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const id = setInterval(() => loadOrders({ silent: true }), 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, soundOn]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("caspian_admin_sound", next ? "on" : "off");
    if (next) {
      ringtoneRef.current.play();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }

  async function updateStatus(orderId, newStatus) {
    try {
      const updated = await adminApi.updateOrderStatus(orderId, newStatus);
      setOrders((current) =>
        current.map((order) => (order._id === updated._id ? updated : order))
      );
    } catch (err) {
      alert(err.message || "Could not update order");
    }
  }

  async function setEstimate(orderId, minutes) {
    try {
      const updated = await adminApi.setEstimatedTime(orderId, minutes);
      setOrders((current) =>
        current.map((order) => (order._id === updated._id ? updated : order))
      );
    } catch (err) {
      alert(err.message || "Could not update estimate");
    }
  }

  async function recheckPayment(order) {
    if (!order.stripeSessionId) {
      alert("This order has no Stripe session linked.");
      return;
    }
    try {
      await paymentApi.verifySession(order.stripeSessionId);
      await loadOrders();
    } catch (err) {
      alert(err.message || "Could not verify payment");
    }
  }

  function printReceipt(order) {
    const addressText =
      typeof order.address === "string"
        ? order.address
        : order.address
        ? `\nAddress:\n${order.address.label || ""}\n${order.address.line1 || ""}\n${order.address.line2 || ""}\n${order.address.city || ""}\n${order.address.postcode || ""}\n${order.address.instructions || ""}`
        : "Address: Not provided";
    const receipt = `
Caspian Tandoori
------------------------
Order ID: ${order._id}
Date: ${formatOrderTime(order.createdAt)}
Customer: ${order.customerName}
Phone: ${order.phone}
Type: ${order.orderType}
Status: ${order.status}
${addressText}
Items:
${order.items
  .map((item) => `${item.qty} x ${item.name} - ${money(item.price * item.qty)}`)
  .join("\n")}

Subtotal: ${money(order.subtotal || 0)}
Delivery: ${money(order.deliveryFee || 0)}
Total: ${money(order.total)}
Notes: ${order.notes || "None"}
`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<pre>${receipt}</pre>`);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div data-testid="admin-orders">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-4xl font-black text-white">Orders</h2>
          <p className="mt-2 text-white/55">
            View, search, filter, print and update customer orders.
          </p>
        </div>

        <button
          onClick={toggleSound}
          data-testid="admin-sound-toggle"
          className={`rounded-full px-5 py-3 text-sm font-black ${
            soundOn
              ? "bg-emerald-500/20 text-emerald-200"
              : "bg-white/10 text-white/60"
          }`}
        >
          {soundOn ? "🔔 Sound on — click to test" : "🔕 Sound off"}
        </button>
      </div>

      {newOrderFlash > 0 && (
        <div
          data-testid="new-order-banner"
          className="mb-4 animate-pulse rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-4 font-black text-emerald-200"
        >
          🛎️ {newOrderFlash} new {newOrderFlash === 1 ? "order" : "orders"} just came in!
        </div>
      )}

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_240px_140px]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer name or phone..."
          className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item === "all" ? "All statuses" : item}
            </option>
          ))}
        </select>

        <button
          onClick={() => loadOrders()}
          className="rounded-xl bg-[#ff5b00] px-5 py-3 font-black text-white"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-white/60">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-white/60">No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              data-testid={`admin-order-${order._id}`}
              className={`rounded-2xl border border-white/10 p-5 ${
                order.status === "Pending Payment"
                  ? "bg-[#0a0a0a] opacity-60"
                  : "bg-[#101010]"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-[0.25em] text-[#ff5b00]">
                    {order.orderType}
                  </p>

                  <h3 className="mt-2 text-2xl font-black text-white">
                    {order.customerName}
                  </h3>

                  <p className="mt-1 text-white/55">{order.phone}</p>

                  {order.user?.email && (
                    <p className="text-white/45">{order.user.email}</p>
                  )}

                  {/* ── ORDER DATE & TIME ── */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                      <span className="text-base">🕐</span>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-white/40">
                          Order placed
                        </p>
                        <p className="text-sm font-bold text-white">
                          {formatOrderTime(order.createdAt)}
                        </p>
                      </div>
                      <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-white/50">
                        {timeAgo(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-white/35">
                    Order ID: {order._id}
                  </p>

                  {order.scheduledFor && (
                    <p className="mt-2 inline-block rounded-md bg-amber-500/15 px-2 py-1 text-xs font-black text-amber-200">
                      📅 Scheduled for: {new Date(order.scheduledFor).toLocaleString("en-GB", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </p>
                  )}

                  <p
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      order.status === "Pending Payment"
                        ? "bg-white/10 text-white/50"
                        : order.status === "Pending"
                        ? "bg-amber-500/20 text-amber-200"
                        : order.status === "Accepted" || order.status === "Preparing"
                        ? "bg-sky-500/20 text-sky-200"
                        : order.status === "Ready" || order.status === "Out for delivery"
                        ? "bg-indigo-500/20 text-indigo-200"
                        : order.status === "Completed" || order.status === "Delivered"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : order.status === "Cancelled"
                        ? "bg-red-500/20 text-red-200"
                        : "bg-white/10 text-white/60"
                    }`}
                    data-testid={`workflow-status-${order._id}`}
                  >
                    {order.status === "Pending"
                      ? "🆕 New — needs accept"
                      : order.status === "Pending Payment"
                      ? "Awaiting payment / abandoned"
                      : order.status}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-3xl font-black text-white">
                    {money(order.total)}
                  </p>
                  {order.deliveryFee > 0 && (
                    <p className="text-xs text-white/45">
                      incl. {money(order.deliveryFee)} delivery ({order.deliveryArea})
                    </p>
                  )}
                  <p
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black ${
                      order.paymentStatus === "Paid"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : order.paymentStatus === "Failed" || order.paymentStatus === "Refunded"
                        ? "bg-red-500/20 text-red-200"
                        : "bg-amber-500/20 text-amber-200"
                    }`}
                    data-testid={`payment-status-${order._id}`}
                  >
                    {order.paymentStatus === "Paid"
                      ? "✓ PAID"
                      : `Payment: ${order.paymentStatus || "Pending"}`}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl bg-black/40 p-4">
                <h4 className="mb-3 font-black text-white">Items</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex justify-between gap-4 text-white/65"
                    >
                      <span>
                        {item.qty} x {item.name}
                      </span>
                      <span>{money(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                {order.subtotal > 0 && (
                  <div className="mt-3 border-t border-white/10 pt-3 text-sm text-white/45">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{money(order.subtotal)}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery ({order.deliveryArea})</span>
                        <span>{money(order.deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-white">
                      <span>Total</span>
                      <span>{money(order.total)}</span>
                    </div>
                  </div>
                )}
              </div>

              {order.address && (
                <div className="mt-4 rounded-xl bg-black/40 p-4 text-white/60">
                  <h4 className="mb-2 font-black text-white">Delivery Address</h4>
                  {typeof order.address === "string" ? (
                    <p>{order.address}</p>
                  ) : (
                    <>
                      <p>{order.address.label}</p>
                      <p>{order.address.line1}</p>
                      <p>{order.address.line2}</p>
                      <p>{order.address.city}</p>
                      <p>{order.address.postcode}</p>
                      <p>{order.address.instructions}</p>
                    </>
                  )}
                </div>
              )}

              {order.notes && (
                <p className="mt-4 rounded-xl bg-black/40 p-4 text-white/60">
                  Notes: {order.notes}
                </p>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order._id, e.target.value)}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                  data-testid={`status-select-${order._id}`}
                >
                  {statuses
                    .filter((item) => item !== "all")
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => updateStatus(order._id, "Accepted")}
                    className="rounded-xl bg-green-600 px-4 py-3 font-black text-white"
                  >
                    Accept
                  </button>

                  <button
                    onClick={() => updateStatus(order._id, "Cancelled")}
                    className="rounded-xl bg-red-600 px-4 py-3 font-black text-white"
                  >
                    Reject
                  </button>

                  <button
                    onClick={() => printReceipt(order)}
                    className="rounded-xl border border-white/10 px-4 py-3 font-black text-white"
                  >
                    Print
                  </button>

                  {order.paymentStatus !== "Paid" && order.stripeSessionId && (
                    <button
                      onClick={() => recheckPayment(order)}
                      data-testid={`recheck-payment-${order._id}`}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 font-black text-emerald-200"
                    >
                      Re-check payment
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-black/40 p-3 text-sm">
                <span className="font-bold text-white/65">Estimated time:</span>
                {[15, 30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    onClick={() => setEstimate(order._id, m)}
                    data-testid={`eta-${order._id}-${m}`}
                    className={`rounded-full px-3 py-1 font-bold ${
                      order.estimatedMinutes === m
                        ? "bg-[#ff5b00] text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
                {order.estimatedReadyAt && (
                  <span className="ml-2 text-white/55">
                    Ready by{" "}
                    {new Date(order.estimatedReadyAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
