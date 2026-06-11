import { useEffect, useRef, useState } from "react";
import { adminApi, paymentApi } from "../../api";

const statuses = [
  "all",
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

function paymentMethodLabel(order) {
  const method = order.paymentMethod || order.paymentProvider || "cash";
  if (method === "stripe") return "Stripe";
  if (method === "paypal") return "PayPal";
  if (method === "cash") return "Cash / pay in store";
  return method;
}

function transactionId(order) {
  return (
    order.transactionId ||
    order.stripePaymentIntentId ||
    order.paypalOrderId ||
    order.stripeSessionId ||
    ""
  );
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
    if (continuousRingRef.current) {
      clearInterval(continuousRingRef.current);
      continuousRingRef.current = null;
    }
    return () => {
      if (continuousRingRef.current) clearInterval(continuousRingRef.current);
    };
  }, [orders]);

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
  }, [status]);

  useEffect(() => {
    const id = setInterval(() => loadOrders({ silent: true }), 6000);
    return () => clearInterval(id);
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
    const addressLines = (() => {
      if (!order.address) return [];
      if (typeof order.address === "string") return [order.address];
      return [
        order.address.label,
        order.address.line1,
        order.address.line2,
        order.address.city,
        order.address.postcode,
        order.address.instructions,
      ].filter(Boolean);
    })();

    const isDelivery = order.orderType === "Delivery";
    const isPaid = order.paymentStatus === "Paid";
    const shortId = order._id.slice(-6).toUpperCase();
    const dateStr = formatOrderTime(order.createdAt);
    const scheduledStr = order.scheduledFor
      ? new Date(order.scheduledFor).toLocaleString("en-GB", {
          weekday: "short", day: "2-digit", month: "short",
          year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
        })
      : null;

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding:7px 0; vertical-align:top;">
            <span style="display:inline-block; background:#1a1a1a; color:#fff; font-size:11px; font-weight:700; border-radius:4px; padding:1px 7px; margin-right:6px;">${item.qty}&times;</span>
            <span style="font-size:13.5px; font-weight:600; color:#111;">${item.name}</span>
            ${item.category ? `<br><span style="font-size:11px; color:#888; margin-left:26px;">${item.category}</span>` : ""}
          </td>
          <td style="padding:7px 0; text-align:right; vertical-align:top; font-size:13.5px; font-weight:700; color:#111; white-space:nowrap;">${money(item.price * item.qty)}</td>
        </tr>`
      )
      .join("");

    const barsHtml = [18,12,22,10,20,14,24,8,18,16,22,10,20,26,12,18,14,22,10,24,16,20,12,18,22,8,14,20,18,24,10,16,22,12,20,18,14,22]
      .map((h, i) => {
        const w = i % 3 === 0 ? 3 : i % 5 === 0 ? 2 : 1;
        return `<div style="width:${w}px;height:${h}px;background:#222;border-radius:1px;flex-shrink:0;"></div>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Order Receipt #${shortId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: #f0ede8;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 32px 16px 64px;
    }
    .receipt {
      width: 360px;
      background: #fff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.07);
    }
    .header {
      background: #111;
      color: #fff;
      padding: 24px 24px 20px;
    }
    .header-brand {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #ff5b00;
      margin-bottom: 8px;
    }
    .header-ordernum {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header-date {
      font-size: 11px;
      color: #888;
      margin-top: 3px;
      font-family: 'DM Mono', monospace;
      letter-spacing: 0.02em;
    }
    .payment-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      margin-top: 14px;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }
    .badge-paid   { background: rgba(16,185,129,0.18); color: #10b981; border: 1px solid rgba(16,185,129,0.35); }
    .badge-unpaid { background: rgba(255,91,0,0.15);   color: #ff5b00; border: 1px solid rgba(255,91,0,0.3); }
    .type-strip {
      padding: 11px 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.03em;
      color: #fff;
    }
    .type-delivery   { background: #ff5b00; }
    .type-collection { background: #1a1a1a; }
    .body { padding: 4px 0; }
    .section {
      padding: 14px 24px;
      border-bottom: 1px dashed #eaeaea;
    }
    .section:last-child { border-bottom: none; }
    .sec-label {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #bbb;
      margin-bottom: 7px;
    }
    .cust-name {
      font-size: 18px;
      font-weight: 800;
      color: #111;
      letter-spacing: -0.4px;
    }
    .cust-detail {
      font-size: 12.5px;
      color: #666;
      margin-top: 3px;
      font-family: 'DM Mono', monospace;
    }
    .addr-line {
      font-size: 13px;
      color: #333;
      line-height: 1.7;
    }
    .items-table { width: 100%; border-collapse: collapse; }
    .item-sep {
      border: none;
      border-top: 1px solid #f2f2f2;
      margin: 0;
    }
    .total-divider {
      border: none;
      border-top: 1.5px solid #111;
      margin: 10px 0 0;
    }
    .sub-row td { font-size: 13px; color: #666; padding: 3px 0; }
    .sub-row td:last-child { text-align: right; }
    .total-row td { font-size: 17px; font-weight: 800; color: #111; padding-top: 10px; }
    .total-row td:last-child { text-align: right; color: #ff5b00; }
    .notes-box {
      background: #fafaf8;
      border: 1px solid #ebebeb;
      border-radius: 9px;
      padding: 10px 13px;
      font-size: 13px;
      color: #444;
      line-height: 1.6;
    }
    .sched-box {
      background: #fffcf0;
      border: 1.5px solid #ffd60a;
      border-radius: 9px;
      padding: 9px 13px;
      font-size: 13px;
      font-weight: 600;
      color: #7a5c00;
    }
    .footer {
      background: #f7f6f3;
      border-top: 1px dashed #e0e0e0;
      padding: 18px 24px 6px;
      text-align: center;
    }
    .barcode {
      display: flex;
      gap: 2px;
      justify-content: center;
      align-items: flex-end;
      height: 32px;
      margin-bottom: 10px;
    }
    .footer-id {
      font-family: 'DM Mono', monospace;
      font-size: 10.5px;
      color: #bbb;
      letter-spacing: 0.09em;
      margin-bottom: 4px;
    }
    .footer-thanks {
      font-size: 13px;
      font-weight: 700;
      color: #444;
      margin-bottom: 18px;
    }
    .print-btn {
      display: block;
      width: calc(100% - 48px);
      margin: 0 24px 20px;
      padding: 14px;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 12px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.04em;
      transition: background 0.2s;
    }
    .print-btn:hover { background: #ff5b00; }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; width: 100%; }
      .print-btn { display: none !important; }
      .footer { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="receipt">

    <div class="header">
      <div class="header-brand">&#127829; Caspian Tandoori</div>
      <div class="header-ordernum">Order #${shortId}</div>
      <div class="header-date">${dateStr}</div>
      <div class="payment-badge ${isPaid ? "badge-paid" : "badge-unpaid"}">
        ${isPaid ? "&#10003;&nbsp; Payment Confirmed" : "&#9203;&nbsp; " + (order.paymentStatus || "Payment Pending")}
      </div>
    </div>

    <div class="type-strip ${isDelivery ? "type-delivery" : "type-collection"}">
      ${isDelivery ? "&#128693;&nbsp; Delivery Order" : "&#127978;&nbsp; Collection &mdash; Pick up in store"}
    </div>

    <div class="body">

      <div class="section">
        <div class="sec-label">Customer</div>
        <div class="cust-name">${order.customerName}</div>
        <div class="cust-detail">&#128222; ${order.phone}</div>
        ${order.user?.email ? `<div class="cust-detail">&#9993; ${order.user.email}</div>` : ""}
      </div>

      ${isDelivery && addressLines.length ? `
      <div class="section">
        <div class="sec-label">Deliver to</div>
        <div class="addr-line">${addressLines.join("<br>")}</div>
      </div>` : ""}

      ${scheduledStr ? `
      <div class="section">
        <div class="sec-label">Scheduled for</div>
        <div class="sched-box">&#128197; ${scheduledStr}</div>
      </div>` : ""}

      <div class="section">
        <div class="sec-label">Items ordered</div>
        <table class="items-table">${itemsHtml}</table>
      </div>

      <div class="section">
        <table style="width:100%;border-collapse:collapse;">
          <tr class="sub-row"><td>Subtotal</td><td>${money(order.subtotal || 0)}</td></tr>
          ${Number(order.deliveryFee) > 0 ? `<tr class="sub-row"><td>Delivery${order.deliveryArea ? ` (${order.deliveryArea})` : ""}</td><td>${money(order.deliveryFee)}</td></tr>` : ""}
          <tr><td colspan="2"><hr class="total-divider"></td></tr>
          <tr class="total-row"><td>Total paid</td><td>${money(order.total)}</td></tr>
        </table>
      </div>

      ${order.notes ? `
      <div class="section">
        <div class="sec-label">Order notes</div>
        <div class="notes-box">&#128221; ${order.notes}</div>
      </div>` : ""}

    </div>

    <div class="footer">
      <div class="barcode">${barsHtml}</div>
      <div class="footer-id">ORDER-${order._id.slice(-10).toUpperCase()}</div>
      <div class="footer-thanks">Thank you for your order! &#128591;</div>
    </div>

    <button class="print-btn" onclick="window.print()">&#128438; Print Receipt</button>

  </div>
  <script>
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(() => window.print(), 500));
    } else {
      setTimeout(() => window.print(), 900);
    }
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=460,height=820");
    if (!printWindow) {
      alert("Please allow pop-ups to print the receipt.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
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
                        weekday: "short", day: "2-digit", month: "short",
                        year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
                      })}
                    </p>
                  )}

                  <p
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                      order.status === "Pending"
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
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/60">
                    <p>
                      <span className="font-black text-white/45">Payment Method:</span>{" "}
                      {paymentMethodLabel(order)}
                    </p>
                    <p>
                      <span className="font-black text-white/45">Payment Status:</span>{" "}
                      {order.paymentStatus || "Pending"}
                    </p>
                    {transactionId(order) && (
                      <p className="break-all">
                        <span className="font-black text-white/45">Transaction ID:</span>{" "}
                        {transactionId(order)}
                      </p>
                    )}
                  </div>
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
                    className="rounded-xl border border-white/10 px-4 py-3 font-black text-white hover:border-[#ff5b00] hover:text-[#ff5b00] transition"
                  >
                    🖨️ Print
                  </button>

                  {order.paymentProvider === "stripe" && order.paymentStatus !== "Paid" && order.stripeSessionId && (
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
