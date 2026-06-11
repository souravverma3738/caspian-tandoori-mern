function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paymentMethodLabel(order) {
  const method = order.paymentMethod || order.paymentProvider || "cash";
  if (method === "stripe") return "Stripe";
  if (method === "paypal") return "PayPal";
  if (method === "cash") return "Cash / pay in store";
  return method;
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

export function printOrderReceipt(order) {
  if (!order?._id) return;

  const shortId = order._id.slice(-6).toUpperCase();
  const lines = addressLines(order);
  const isDelivery = order.orderType === "Delivery";
  const scheduled = order.scheduledFor
    ? new Date(order.scheduledFor).toLocaleString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "ASAP";
  const discountLabel =
    order.couponCode || (order.discountSource === "website_offer" ? "Website offer" : "");

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
        <div class="item">
          <div><strong>${escapeHtml(item.qty)} x ${escapeHtml(item.name)}</strong></div>
          <div>${escapeHtml(money(Number(item.price || 0) * Number(item.qty || 0)))}</div>
        </div>`
    )
    .join("");

  const addressHtml = lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Order #${escapeHtml(shortId)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #000; font-family: "Courier New", monospace; font-size: 12px; }
    .receipt { width: 80mm; max-width: 80mm; padding: 3mm; }
    .center { text-align: center; }
    .brand { font-size: 19px; font-weight: 900; }
    .order { margin-top: 3mm; border: 2px solid #000; padding: 2mm; text-align: center; font-size: 22px; font-weight: 900; }
    .type { margin-top: 2mm; padding: 2mm; background: #000; color: #fff; text-align: center; font-size: 18px; font-weight: 900; }
    .section { border-top: 1px dashed #000; margin-top: 3mm; padding-top: 2mm; }
    .label { font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .large { font-size: 16px; font-weight: 900; overflow-wrap: anywhere; }
    .row, .item { display: flex; justify-content: space-between; gap: 2mm; }
    .item { border-bottom: 1px dotted #000; padding: 2mm 0; font-size: 14px; }
    .total { border-top: 2px solid #000; margin-top: 1mm; padding-top: 1mm; font-size: 18px; font-weight: 900; }
    .notes { border: 2px solid #000; padding: 2mm; font-size: 14px; font-weight: 900; overflow-wrap: anywhere; }
    .print-btn { width: calc(100% - 6mm); margin: 4mm 3mm; padding: 3mm; border: 0; background: #000; color: #fff; font-weight: 900; }
    @media print { .print-btn { display: none !important; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center brand">CASPIAN TANDOORI</div>
    <div class="center">26 Main Street, Kelty</div>
    <div class="center">01383 830 166</div>
    <div class="order">ORDER #${escapeHtml(shortId)}</div>
    <div class="type">${escapeHtml(isDelivery ? "Delivery" : "Collection")}</div>
    <div class="section center large">${escapeHtml(scheduled)}</div>
    <div class="section">
      <div class="row"><span>Status</span><span>${escapeHtml(order.status || "")}</span></div>
      <div class="row"><span>Payment</span><span>${escapeHtml(order.paymentStatus || "Pending")}</span></div>
      <div class="row"><span>Method</span><span>${escapeHtml(paymentMethodLabel(order))}</span></div>
    </div>
    <div class="section">
      <div class="label">Customer</div>
      <div class="large">${escapeHtml(order.customerName)}</div>
      <div class="large">${escapeHtml(order.phone)}</div>
    </div>
    ${isDelivery && lines.length ? `<div class="section"><div class="label">Delivery address</div><div class="large">${addressHtml}</div></div>` : ""}
    <div class="section"><div class="label">Items</div>${itemsHtml}</div>
    <div class="section">
      <div class="row"><span>Subtotal</span><span>${escapeHtml(money(order.subtotal || 0))}</span></div>
      ${Number(order.deliveryFee) > 0 ? `<div class="row"><span>Delivery</span><span>${escapeHtml(money(order.deliveryFee))}</span></div>` : ""}
      ${Number(order.discountAmount || 0) > 0 ? `<div class="row"><span>Discount ${escapeHtml(discountLabel)}</span><span>-${escapeHtml(money(order.discountAmount))}</span></div>` : ""}
      <div class="row total"><span>TOTAL PAID</span><span>${escapeHtml(money(order.finalTotal || order.total))}</span></div>
    </div>
    ${order.notes ? `<div class="section"><div class="label">Notes / allergies</div><div class="notes">${escapeHtml(order.notes)}</div></div>` : ""}
    <button class="print-btn" onclick="window.print()">Print Receipt</button>
  </div>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));</script>
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
