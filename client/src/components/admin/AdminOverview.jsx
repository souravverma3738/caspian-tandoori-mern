import { useEffect, useState } from "react";
import { adminApi } from "../../api";

function StatCard({ title, value, note }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101010] p-5">
      <p className="text-sm font-black uppercase tracking-[0.25em] text-white/45">
        {title}
      </p>
      <h3 className="mt-4 text-4xl font-black text-white">{value}</h3>
      <p className="mt-2 text-sm text-white/50">{note}</p>
    </div>
  );
}

function InfoBox({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101010] p-6">
      <h3 className="text-xl font-black text-white">{title}</h3>
      <div className="mt-4 text-sm text-white/60">{children}</div>
    </div>
  );
}

export default function AdminOverview() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await adminApi.dashboard();
        setDashboard(data);
      } catch (err) {
        setError(err.message || "Could not load dashboard");
      }
    }

    loadDashboard();
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        {error}
      </div>
    );
  }

  if (!dashboard) {
    return <p className="text-white/60">Loading dashboard...</p>;
  }

  const popularDish = dashboard.bestSellingItems?.[0];

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-serif text-4xl font-black text-white">
          Dashboard Overview
        </h2>
        <p className="mt-2 text-white/55">
          Real restaurant activity from your database.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today Sales"
          value={`£${Number(dashboard.todayRevenue || 0).toFixed(2)}`}
          note="Real revenue today"
        />

        <StatCard
          title="Total Orders Today"
          value={dashboard.todayOrders || 0}
          note="Orders created today"
        />

        <StatCard
          title="Active Orders"
          value={dashboard.pendingOrders || 0}
          note="Orders waiting or active"
        />

        <StatCard
          title="Completed Orders"
          value={dashboard.completedOrders || 0}
          note="Finished orders"
        />

        <StatCard
          title="Total Customers"
          value={dashboard.totalCustomers || 0}
          note="Registered customers"
        />

        <StatCard
          title="Total Revenue"
          value={`£${Number(dashboard.totalRevenue || 0).toFixed(2)}`}
          note="All-time revenue"
        />

        <StatCard
          title="Popular Dish"
          value={popularDish?.name || "No orders"}
          note={popularDish ? `${popularDish.qty} sold` : "No sales yet"}
        />

        <StatCard
          title="Temperature Alerts"
          value="0"
          note="No temperature model yet"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <InfoBox title="Popular Dishes">
          {dashboard.bestSellingItems?.length ? (
            <ul className="space-y-3">
              {dashboard.bestSellingItems.map((item, index) => (
                <li key={item.name}>
                  {index + 1}. {item.name} — {item.qty} sold
                </li>
              ))}
            </ul>
          ) : (
            <p>No dishes sold yet.</p>
          )}
        </InfoBox>

        <InfoBox title="Business Summary">
          <ul className="space-y-3">
            <li>Today orders: {dashboard.todayOrders || 0}</li>
            <li>Pending orders: {dashboard.pendingOrders || 0}</li>
            <li>Completed orders: {dashboard.completedOrders || 0}</li>
            <li>Total customers: {dashboard.totalCustomers || 0}</li>
          </ul>
        </InfoBox>
      </div>
    </div>
  );
}