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

function isPendingOrderStatus(status) {
  return status === "Pending" || status === "New";
}

function isAcceptedOrderStatus(status) {
  return status === "Accepted";
}

function isRejectedOrderStatus(status) {
  return status === "Cancelled" || status === "Rejected";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const autoPrintedAcceptedIdsRef = useRef(new Set());

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
    const syncUpdatedOrder = (event) => {
      const updated = event.detail;
      if (!updated?._id) return;
      setOrders((current) =>
        current.map((order) => (order._id === updated._id ? updated : order))
      );
      knownOrderIdsRef.current.add(updated._id);
    };

    window.addEventListener("caspian-admin-order-updated", syncUpdatedOrder);
    return () => {
      window.removeEventListener("caspian-admin-order-updated", syncUpdatedOrder);
    };
  }, []);

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

  async function updateStatus(orderOrId, newStatus) {
    const orderId = typeof orderOrId === "string" ? orderOrId : orderOrId._id;
    const previousStatus =
      typeof orderOrId === "string"
        ? orders.find((order) => order._id === orderId)?.status
        : orderOrId.status;

    try {
      const updated = await adminApi.updateOrderStatus(orderId, newStatus);
      setOrders((current) =>
        current.map((order) => (order._id === updated._id ? updated : order))
      );
      if (
        newStatus === "Accepted" &&
        previousStatus !== "Accepted" &&
        !autoPrintedAcceptedIdsRef.current.has(updated._id)
      ) {
        autoPrintedAcceptedIdsRef.current.add(updated._id);
        printReceipt(updated);
      }
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
    const shortId = order._id.slice(-6).toUpperCase();
    const orderDate = new Date(order.createdAt).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const scheduledStr = order.scheduledFor
      ? new Date(order.scheduledFor).toLocaleString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "ASAP";
    const paymentLabel = paymentMethodLabel(order);
    const transaction = transactionId(order);
    const discountLabel = order.couponCode || (order.discountSource === "website_offer" ? "Website offer" : "");

    const itemsHtml = order.items
      .map((item) => {
        const lineTotal = money(Number(item.price || 0) * Number(item.qty || 0));
        return `
          <div class="item">
            <div class="item-main">
              <span class="qty">${escapeHtml(item.qty)}x</span>
              <span class="item-name">${escapeHtml(item.name)}</span>
            </div>
            <div class="item-price">${escapeHtml(lineTotal)}</div>
            ${item.category ? `<div class="item-note">${escapeHtml(item.category)}</div>` : ""}
          </div>`;
      })
      .join("");

    const addressHtml = addressLines
      .map((line) => `<div>${escapeHtml(line)}</div>`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Order #${escapeHtml(shortId)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
    }
    html,
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: "Courier New", Consolas, monospace;
      font-size: 12px;
      line-height: 1.25;
    }
    .receipt {
      width: 80mm;
      max-width: 80mm;
      padding: 3mm;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 900; }
    .brand {
      font-size: 19px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .order-no {
      margin-top: 3mm;
      border: 2px solid #000;
      padding: 2mm;
      font-size: 22px;
      font-weight: 900;
      text-align: center;
    }
    .service-type {
      margin-top: 2mm;
      padding: 2mm 1mm;
      background: #000;
      color: #fff;
      font-size: 18px;
      font-weight: 900;
      text-align: center;
      text-transform: uppercase;
    }
    .scheduled {
      margin-top: 2mm;
      border: 2px solid #000;
      padding: 2mm;
      font-size: 16px;
      font-weight: 900;
      text-align: center;
    }
    .section {
      border-top: 1px dashed #000;
      margin-top: 3mm;
      padding-top: 2mm;
    }
    .label {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 1mm;
    }
    .large {
      font-size: 16px;
      font-weight: 900;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
    }
    .item {
      border-bottom: 1px dotted #000;
      padding: 2mm 0;
    }
    .item-main {
      display: flex;
      gap: 2mm;
      font-size: 15px;
      font-weight: 900;
    }
    .qty {
      min-width: 8mm;
    }
    .item-name {
      flex: 1;
      overflow-wrap: anywhere;
    }
    .item-price {
      margin-top: 1mm;
      text-align: right;
      font-size: 13px;
      font-weight: 900;
    }
    .item-note {
      margin-left: 10mm;
      font-size: 11px;
    }
    .totals {
      font-size: 13px;
      font-weight: 900;
    }
    .grand-total {
      border-top: 2px solid #000;
      margin-top: 1mm;
      padding-top: 1mm;
      font-size: 18px;
      font-weight: 900;
    }
    .notes {
      border: 2px solid #000;
      padding: 2mm;
      font-size: 14px;
      font-weight: 900;
      overflow-wrap: anywhere;
    }
    .print-btn {
      display: block;
      width: calc(100% - 6mm);
      margin: 4mm 3mm;
      padding: 3mm;
      border: 0;
      background: #000;
      color: #fff;
      font: 900 14px Arial, sans-serif;
      cursor: pointer;
    }
    @media print {
      .print-btn { display: none !important; }
      .receipt { width: 80mm; max-width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center brand">CASPIAN TANDOORI</div>
    <div class="center">26 Main Street, Kelty</div>
    <div class="center">01383 830 166</div>

    <div class="order-no">ORDER #${escapeHtml(shortId)}</div>
    <div class="service-type">${escapeHtml(isDelivery ? "Delivery" : "Collection")}</div>
    <div class="scheduled">${escapeHtml(scheduledStr)}</div>

    <div class="section">
      <div class="row"><span>Placed</span><span>${escapeHtml(orderDate)}</span></div>
      <div class="row"><span>Status</span><span>${escapeHtml(order.status || "")}</span></div>
      <div class="row"><span>Payment</span><span>${escapeHtml(order.paymentStatus || "Pending")}</span></div>
      <div class="row"><span>Method</span><span>${escapeHtml(paymentLabel)}</span></div>
      ${transaction ? `<div>Txn: ${escapeHtml(transaction)}</div>` : ""}
    </div>

    <div class="section">
      <div class="label">Customer</div>
      <div class="large">${escapeHtml(order.customerName)}</div>
      <div class="large">${escapeHtml(order.phone)}</div>
      ${order.user?.email ? `<div>${escapeHtml(order.user.email)}</div>` : ""}
    </div>

    ${isDelivery && addressLines.length ? `
    <div class="section">
      <div class="label">Delivery address</div>
      <div class="large">${addressHtml}</div>
    </div>` : ""}

    <div class="section">
      <div class="label">Items</div>
      ${itemsHtml}
    </div>

    <div class="section totals">
      <div class="row"><span>Subtotal</span><span>${escapeHtml(money(order.subtotal || 0))}</span></div>
      ${Number(order.deliveryFee) > 0 ? `<div class="row"><span>Delivery${order.deliveryArea ? ` (${escapeHtml(order.deliveryArea)})` : ""}</span><span>${escapeHtml(money(order.deliveryFee))}</span></div>` : ""}
      ${Number(order.discountAmount || 0) > 0 ? `<div class="row"><span>Discount ${escapeHtml(discountLabel)}</span><span>-${escapeHtml(money(order.discountAmount))}</span></div>` : ""}
      <div class="row grand-total"><span>TOTAL PAID</span><span>${escapeHtml(money(order.finalTotal || order.total))}</span></div>
    </div>

    ${order.notes ? `
    <div class="section">
      <div class="label">Notes / allergies</div>
      <div class="notes">${escapeHtml(order.notes)}</div>
    </div>` : ""}

    <div class="section center">
      <div>ORDER-${escapeHtml(order._id.slice(-10).toUpperCase())}</div>
      <div>Keep this slip with the order</div>
    </div>

    <button class="print-btn" onclick="window.print()">Print Receipt</button>
  </div>
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 250));
  </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=360,height=760");
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
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-300">
                        <span>
                          Discount {order.couponCode || order.discountSource || ""}
                        </span>
                        <span>-{money(order.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-white">
                      <span>Final paid</span>
                      <span>{money(order.finalTotal || order.total)}</span>
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
                  onChange={(e) => updateStatus(order, e.target.value)}
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
                  {isPendingOrderStatus(order.status) && (
                    <>
                  <button
                    onClick={() => updateStatus(order, "Accepted")}
                    className="rounded-xl bg-green-600 px-4 py-3 font-black text-white"
                  >
                    Accept
                  </button>

                  <button
                    onClick={() => updateStatus(order, "Cancelled")}
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
                    </>
                  )}

                  {!isPendingOrderStatus(order.status) && !isRejectedOrderStatus(order.status) && (
                    <button
                      onClick={() => printReceipt(order)}
                      className="rounded-xl border border-white/10 px-4 py-3 font-black text-white transition hover:border-[#ff5b00] hover:text-[#ff5b00]"
                    >
                      {isAcceptedOrderStatus(order.status) ? "Print Again" : "Print"}
                    </button>
                  )}

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
