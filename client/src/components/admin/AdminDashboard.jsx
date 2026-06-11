import React, { useState, useEffect } from "react";
import AdminOverview from "./AdminOverview";
import AdminOrders from "./AdminOrders";
import AdminCustomers from "./AdminCustomers";
import AdminClockInOut from "./AdminClockInOut";
import AdminTemperatures from "./AdminTemperatures";
import AdminReports from "./AdminReports";
import AdminSettings from "./AdminSettings";
import AdminOrderNotifier from "./AdminOrderNotifier";

function AdminDashboard({ user, go }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setInstallPrompt(null);
    }
  }

  if (!user || user.role !== "admin") {
    go("admin-login");
    return null;
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
      <AdminOrderNotifier onViewDetails={() => setActiveTab("orders")} />

      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-3 text-sm font-black uppercase tracking-[0.35em] text-[#ff5b00]">
            Admin Panel
          </p>
          <h1 className="font-serif text-6xl font-black">Business Control Centre</h1>
          <p className="mt-4 text-white/60">
            Manage orders, staff, temperature records, reports and restaurant settings.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          {installed ? (
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-black text-emerald-200">
              ✓ App installed
            </div>
          ) : installPrompt ? (
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 rounded-full bg-[#ff5b00] px-6 py-3 font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 active:scale-95"
            >
              <span className="text-lg">📲</span>
              Install Admin App
            </button>
          ) : (
            <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white/40">
              Open in browser to install
            </div>
          )}
        </div>
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
