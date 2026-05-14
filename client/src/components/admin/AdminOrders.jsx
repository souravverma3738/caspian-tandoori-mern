import { useEffect, useState } from "react";
import { adminApi } from "../../api";

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

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const data = await adminApi.orders({
        status,
        search,
      });
      setOrders(data);
    } catch (err) {
      setError(err.message || "Could not load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [status]);

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

  function printReceipt(order) {
const addressText =
  typeof order.address === "string"
    ? order.address
    : order.address
    ? `
Address:
${order.address.label || ""}
${order.address.line1 || ""}
${order.address.line2 || ""}
${order.address.city || ""}
${order.address.postcode || ""}
${order.address.instructions || ""}
`
    : "Address: Not provided";
    const receipt = `
Caspian Tandoori
------------------------
Order ID: ${order._id}
Customer: ${order.customerName}
Phone: ${order.phone}
Type: ${order.orderType}
Status: ${order.status}
${addressText}
Items:
${order.items
  .map((item) => `${item.qty} x ${item.name} - ${money(item.price * item.qty)}`)
  .join("\n")}

Total: ${money(order.total)}
Notes: ${order.notes || "None"}
`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<pre>${receipt}</pre>`);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-4xl font-black text-white">Orders</h2>
        <p className="mt-2 text-white/55">
          View, search, filter, print and update customer orders.
        </p>
      </div>

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
          onClick={loadOrders}
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
              className="rounded-2xl border border-white/10 bg-[#101010] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
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

                  <p className="mt-3 text-sm text-white/45">
                    Order ID: {order._id}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-3xl font-black text-white">
                    {money(order.total)}
                  </p>
                  <p className="mt-1 text-white/50">{order.paymentStatus}</p>
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
                >
                  {statuses
                    .filter((item) => item !== "all")
                    .map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                </select>

                <div className="flex gap-3">
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
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}