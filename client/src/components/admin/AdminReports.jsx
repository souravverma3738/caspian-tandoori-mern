import { useEffect, useState } from "react";
import { adminApi } from "../../api";

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

export default function AdminReports() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    adminApi.dashboard().then(setDashboard);
  }, []);

  function printReport() {
    window.print();
  }

  if (!dashboard) {
    return <p className="text-white/60">Loading reports...</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-4xl font-black text-white">Reports</h2>
          <p className="mt-2 text-white/55">
            Sales, revenue, customers and best-selling items.
          </p>
        </div>

        <button
          onClick={printReport}
          className="rounded-xl bg-[#ff5b00] px-5 py-3 font-black text-white"
        >
          Print / Save PDF
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-white/45">Today Revenue</p>
          <h3 className="mt-3 text-4xl font-black text-white">
            {money(dashboard.todayRevenue)}
          </h3>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-white/45">Today Orders</p>
          <h3 className="mt-3 text-4xl font-black text-white">
            {dashboard.todayOrders}
          </h3>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-white/45">Total Revenue</p>
          <h3 className="mt-3 text-4xl font-black text-white">
            {money(dashboard.totalRevenue)}
          </h3>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <p className="text-white/45">Customers</p>
          <h3 className="mt-3 text-4xl font-black text-white">
            {dashboard.totalCustomers}
          </h3>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-[#101010] p-6">
        <h3 className="mb-4 text-2xl font-black text-white">
          Most Sold Items
        </h3>

        {dashboard.bestSellingItems?.length ? (
          <div className="space-y-3">
            {dashboard.bestSellingItems.map((item, index) => (
              <div
                key={item.name}
                className="flex justify-between rounded-xl bg-black/40 p-4 text-white/70"
              >
                <span>
                  {index + 1}. {item.name}
                </span>
                <span>{item.qty} sold</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/50">No sales data yet.</p>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-[#101010] p-6">
        <h3 className="mb-4 text-2xl font-black text-white">Tax / VAT</h3>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-black/40 p-4">
            <p className="text-white/45">Gross Sales</p>
            <p className="mt-2 text-2xl font-black text-white">
              {money(dashboard.totalRevenue)}
            </p>
          </div>

          <div className="rounded-xl bg-black/40 p-4">
            <p className="text-white/45">Estimated VAT 20%</p>
            <p className="mt-2 text-2xl font-black text-white">
              {money(Number(dashboard.totalRevenue || 0) * 0.2)}
            </p>
          </div>

          <div className="rounded-xl bg-black/40 p-4">
            <p className="text-white/45">Net Before VAT</p>
            <p className="mt-2 text-2xl font-black text-white">
              {money(Number(dashboard.totalRevenue || 0) / 1.2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}