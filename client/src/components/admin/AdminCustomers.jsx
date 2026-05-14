import { useEffect, useState } from "react";
import { adminApi } from "../../api";

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");
      const data = await adminApi.customers({ search });
      setCustomers(data);
    } catch (err) {
      setError(err.message || "Could not load customers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function toggleBan(customer) {
    try {
      const updated = customer.isBanned
        ? await adminApi.unbanCustomer(customer._id)
        : await adminApi.banCustomer(customer._id);

      setCustomers((current) =>
        current.map((item) =>
          item._id === updated._id ? { ...item, isBanned: updated.isBanned } : item
        )
      );
    } catch (err) {
      alert(err.message || "Could not update customer");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-4xl font-black text-white">Customers</h2>
        <p className="mt-2 text-white/55">
          Manage customer details, spending, addresses and order history.
        </p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_140px]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone or email..."
          className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
        />

        <button
          onClick={loadCustomers}
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
        <p className="text-white/60">Loading customers...</p>
      ) : customers.length === 0 ? (
        <p className="text-white/60">No customers found.</p>
      ) : (
        <div className="space-y-4">
          {customers.map((customer) => (
            <div
              key={customer._id}
              className="rounded-2xl border border-white/10 bg-[#101010] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">
                    {customer.name}
                  </h3>
                  <p className="mt-1 text-white/55">{customer.email}</p>
                  <p className="text-white/55">{customer.phone || "No phone"}</p>

                  {customer.isBanned && (
                    <p className="mt-3 inline-block rounded-full bg-red-500/20 px-3 py-1 text-sm font-black text-red-300">
                      Banned
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:text-right">
                  <div>
                    <p className="text-sm text-white/45">Orders</p>
                    <p className="text-2xl font-black text-white">
                      {customer.orderCount || 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/45">Total Spent</p>
                    <p className="text-2xl font-black text-white">
                      {money(customer.totalSpent)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/45">Addresses</p>
                    <p className="text-2xl font-black text-white">
                      {customer.addresses?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() =>
                    setExpanded(expanded === customer._id ? null : customer._id)
                  }
                  className="rounded-xl border border-white/10 px-4 py-3 font-black text-white"
                >
                  {expanded === customer._id ? "Hide Details" : "View Details"}
                </button>

                <button
                  onClick={() => toggleBan(customer)}
                  className={`rounded-xl px-4 py-3 font-black text-white ${
                    customer.isBanned ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {customer.isBanned ? "Unban Customer" : "Ban Customer"}
                </button>
              </div>

              {expanded === customer._id && (
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-xl bg-black/40 p-4">
                    <h4 className="mb-3 font-black text-white">
                      Saved Addresses
                    </h4>

                    {customer.addresses?.length ? (
                      <div className="space-y-3 text-white/60">
                        {customer.addresses.map((address) => (
                          <div
                            key={address._id}
                            className="rounded-xl border border-white/10 p-3"
                          >
                            <p className="font-bold text-white">
                              {address.label || "Address"}
                            </p>
                            <p>{address.line1}</p>
                            <p>{address.line2}</p>
                            <p>
                              {address.city} {address.postcode}
                            </p>
                            <p>{address.instructions}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/50">No saved addresses.</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-black/40 p-4">
                    <h4 className="mb-3 font-black text-white">
                      Order History
                    </h4>

                    {customer.orders?.length ? (
                      <div className="space-y-3 text-white/60">
                        {customer.orders.map((order) => (
                          <div
                            key={order._id}
                            className="rounded-xl border border-white/10 p-3"
                          >
                            <div className="flex justify-between gap-4">
                              <div>
                                <p className="font-bold text-white">
                                  {order.orderType}
                                </p>
                                <p>{order.status}</p>
                              </div>
                              <p className="font-black text-white">
                                {money(order.total)}
                              </p>
                            </div>

                            <div className="mt-2 text-sm text-white/50">
                              {order.items?.map((item) => (
                                <p key={item._id}>
                                  {item.qty} x {item.name}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/50">No order history.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}