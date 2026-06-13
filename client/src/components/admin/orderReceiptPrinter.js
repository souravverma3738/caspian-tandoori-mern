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
  return method || "-";
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

function itemChoiceLines(item) {
  const lines = [];
  if (item.variant?.name) lines.push(item.variant.name);
  (item.selectedOptions || []).forEach((group) => {
    const names = (group.options || []).map((option) => option.name).filter(Boolean).join(", ");
    if (names) lines.push(`${group.groupName}: ${names}`);
  });
  return lines;
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function printOrderReceipt(order) {
  if (!order?._id) return;

  const shortId = order._id.slice(-6).toUpperCase();
  const lines = addressLines(order);
  const isDelivery = order.orderType === "Delivery";
  const serviceType = isDelivery ? "DELIVERY" : "COLLECTION";
  const scheduled = order.scheduledFor ? formatDateTime(order.scheduledFor) : "ASAP";
  const placed = formatDateTime(order.createdAt);
  const discountLabel =
    order.couponCode || (order.discountSource === "website_offer" ? "Website offer" : "");

  const itemsHtml = (order.items || [])
    .map((item) => {
      const qty = Number(item.qty || 0);
      const lineTotal = Number(item.price || 0) * qty;
      return `
        <div class="item">
          <div class="item-main">
            <span class="qty">${escapeHtml(qty)}x</span>
            <span class="item-name">${escapeHtml(item.name)}</span>
          </div>
          <div class="item-price">${escapeHtml(money(lineTotal))}</div>
          ${itemChoiceLines(item).map((line) => `<div class="item-meta">${escapeHtml(line)}</div>`).join("")}
          ${item.category ? `<div class="item-meta">${escapeHtml(item.category)}</div>` : ""}
        </div>`;
    })
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
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: Arial, "Courier New", monospace;
      font-size: 14px;
      line-height: 1.22;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      width: 80mm;
      max-width: 80mm;
      padding: 4mm 3mm;
      color: #000;
      background: #fff;
      font-weight: 800;
    }
    .center { text-align: center; }
    .brand {
      font-size: 22px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .shop {
      margin-top: 1mm;
      font-size: 12px;
      font-weight: 900;
    }
    .order {
      margin-top: 4mm;
      border: 3px solid #000;
      padding: 2.5mm 1mm;
      text-align: center;
      font-size: 26px;
      line-height: 1;
      font-weight: 900;
    }
    .service {
      margin-top: 3mm;
      padding: 3mm 1mm;
      background: #000;
      color: #fff;
      text-align: center;
      font-size: 26px;
      line-height: 1;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .time {
      margin-top: 3mm;
      border: 3px solid #000;
      padding: 2.5mm 1mm;
      text-align: center;
      font-size: 21px;
      line-height: 1.1;
      font-weight: 900;
    }
    .section {
      border-top: 2px dashed #000;
      margin-top: 3mm;
      padding-top: 2mm;
    }
    .label {
      margin-bottom: 1mm;
      font-size: 13px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 2mm;
      padding: 0.7mm 0;
      font-size: 14px;
      font-weight: 900;
    }
    .row span:last-child {
      text-align: right;
      overflow-wrap: anywhere;
    }
    .customer {
      font-size: 19px;
      line-height: 1.18;
      font-weight: 900;
      overflow-wrap: anywhere;
    }
    .phone {
      margin-top: 1mm;
      font-size: 21px;
      line-height: 1.1;
      font-weight: 900;
    }
    .address,
    .collection-note {
      border: 3px solid #000;
      padding: 2mm;
      font-size: 18px;
      line-height: 1.18;
      font-weight: 900;
      overflow-wrap: anywhere;
    }
    .collection-note {
      text-align: center;
      text-transform: uppercase;
    }
    .item {
      border-bottom: 2px dotted #000;
      padding: 2.2mm 0;
      color: #000;
    }
    .item-main {
      display: flex;
      gap: 2mm;
      font-size: 18px;
      line-height: 1.15;
      font-weight: 900;
    }
    .qty {
      min-width: 11mm;
      font-size: 20px;
      font-weight: 900;
    }
    .item-name {
      flex: 1;
      overflow-wrap: anywhere;
    }
    .item-price {
      margin-top: 1mm;
      text-align: right;
      font-size: 15px;
      font-weight: 900;
    }
    .item-meta {
      margin-left: 13mm;
      margin-top: 1mm;
      font-size: 12px;
      font-weight: 900;
    }
    .totals .row {
      font-size: 15px;
    }
    .total {
      border-top: 3px solid #000;
      margin-top: 1mm;
      padding-top: 2mm;
      font-size: 22px !important;
      line-height: 1;
      font-weight: 900;
    }
    .notes {
      border: 3px solid #000;
      padding: 2mm;
      font-size: 17px;
      line-height: 1.2;
      font-weight: 900;
      overflow-wrap: anywhere;
    }
    .footer {
      margin-top: 3mm;
      border-top: 2px dashed #000;
      padding-top: 2mm;
      text-align: center;
      font-size: 12px;
      font-weight: 900;
    }
    .print-btn {
      width: calc(100% - 6mm);
      margin: 4mm 3mm;
      padding: 3mm;
      border: 0;
      background: #000;
      color: #fff;
      font: 900 15px Arial, sans-serif;
      cursor: pointer;
    }
    @media print {
      body { background: #fff !important; color: #000 !important; }
      .receipt { width: 80mm; max-width: 80mm; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center brand">CASPIAN TANDOORI</div>
    <div class="center shop">26 Main Street, Kelty</div>
    <div class="center shop">01383 830 166</div>

    <div class="order">ORDER #${escapeHtml(shortId)}</div>
    <div class="service">${escapeHtml(serviceType)}</div>
    <div class="time">${escapeHtml(scheduled)}</div>

    <div class="section">
      ${placed ? `<div class="row"><span>Placed</span><span>${escapeHtml(placed)}</span></div>` : ""}
      <div class="row"><span>Status</span><span>${escapeHtml(order.status || "")}</span></div>
      <div class="row"><span>Payment</span><span>${escapeHtml(order.paymentStatus || "Pending")}</span></div>
      <div class="row"><span>Method</span><span>${escapeHtml(paymentMethodLabel(order))}</span></div>
    </div>

    <div class="section">
      <div class="label">Customer</div>
      <div class="customer">${escapeHtml(order.customerName || "-")}</div>
      <div class="phone">${escapeHtml(order.phone || "-")}</div>
    </div>

    ${
      isDelivery && lines.length
        ? `<div class="section"><div class="label">Delivery address</div><div class="address">${addressHtml}</div></div>`
        : `<div class="section"><div class="label">Order type</div><div class="collection-note">Customer collection</div></div>`
    }

    <div class="section">
      <div class="label">Items</div>
      ${itemsHtml || `<div class="item"><div class="item-main">No items</div></div>`}
    </div>

    <div class="section totals">
      <div class="row"><span>Subtotal</span><span>${escapeHtml(money(order.subtotal || 0))}</span></div>
      ${Number(order.deliveryFee) > 0 ? `<div class="row"><span>Delivery</span><span>${escapeHtml(money(order.deliveryFee))}</span></div>` : ""}
      ${Number(order.discountAmount || 0) > 0 ? `<div class="row"><span>Discount ${escapeHtml(discountLabel)}</span><span>-${escapeHtml(money(order.discountAmount))}</span></div>` : ""}
      <div class="row total"><span>TOTAL</span><span>${escapeHtml(money(order.finalTotal || order.total))}</span></div>
    </div>

    ${order.notes ? `<div class="section"><div class="label">Notes / allergies</div><div class="notes">${escapeHtml(order.notes)}</div></div>` : ""}

    <div class="footer">
      <div>ORDER-${escapeHtml(order._id.slice(-10).toUpperCase())}</div>
      <div>Keep this slip with the order</div>
    </div>

    <button class="print-btn" onclick="window.print()">Print Receipt</button>
  </div>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=380,height=800");
  if (!printWindow) {
    alert("Please allow pop-ups to print the receipt.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}
