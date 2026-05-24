import React, { useState } from "react";



import AdminOverview from "./AdminOverview";
import AdminOrders from "./AdminOrders";
import AdminCustomers from "./AdminCustomers";
import AdminClockInOut from "./AdminClockInOut";
import AdminTemperatures from "./AdminTemperatures";
import AdminReports from "./AdminReports";
import AdminSettings from "./AdminSettings";
function AdminDashboard({ user, go }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  if (!user || user.role !== "admin") {
    return (
      <section className="mx-auto max-w-4xl px-5 pb-24 pt-40 text-center">
        <h1 className="font-serif text-5xl font-black">Admin Login Required</h1>
        <button
          onClick={() => go("auth")}
          className="mt-8 rounded-full bg-[#ff5b00] px-8 py-4 font-black text-white"
        >
          Sign In
        </button>
      </section>
    );
  }

  const tabs = [
    ["dashboard", "Dashboard"],
    ["orders", "Orders"],
    ["customers", "Customers"],
    ["clock", "Clock In / Out"],
    ["temperatures", "Temperatures"],
    ["reports", "Reports"],
    ["settings", "Settings"],
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 pb-24 pt-40 lg:px-8">
      <div className="mb-10">
        <p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">
          Admin Panel
        </p>
        <h1 className="font-serif text-6xl font-black">Business Control Centre</h1>
        <p className="mt-4 text-white/60">
          Manage orders, staff, temperature records, reports and restaurant settings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-[#101010] p-4">
          <div className="grid gap-2">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`rounded-xl px-4 py-3 text-left font-bold transition ${
                  activeTab === id
                    ? "bg-[#ff5b00] text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          {activeTab === "dashboard" && <AdminOverview />}
          {activeTab === "orders" && <AdminOrders />}
          {activeTab === "customers" && <AdminCustomers />}
          {activeTab === "clock" && <AdminClockInOut />}
          {activeTab === "temperatures" && <AdminTemperatures />}
          {activeTab === "reports" && <AdminReports />}
          {activeTab === "settings" && <AdminSettings />}
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;