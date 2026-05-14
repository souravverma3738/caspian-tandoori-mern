import { useEffect, useState } from "react";
import { adminApi } from "../../api";

const days = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
];

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.settings().then(setSettings).catch((err) => {
      setError(err.message || "Could not load settings");
    });
  }, []);

  function updateField(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateOpeningHours(day, value) {
    setSettings((current) => ({
      ...current,
      openingHours: {
        ...current.openingHours,
        [day]: value,
      },
    }));
  }

  async function saveSettings(e) {
    e.preventDefault();

    try {
      setError("");
      setMessage("");

      const updated = await adminApi.updateSettings({
        ...settings,
        deliveryFee: Number(settings.deliveryFee || 0),
        minimumOrder: Number(settings.minimumOrder || 0),
        vatRate: Number(settings.vatRate || 0),
        serviceCharge: Number(settings.serviceCharge || 0),
      });

      setSettings(updated);
      setMessage("Settings saved successfully.");
    } catch (err) {
      setError(err.message || "Could not save settings");
    }
  }

  if (!settings) {
    return <p className="text-white/60">Loading settings...</p>;
  }

  return (
    <form onSubmit={saveSettings}>
      <div className="mb-6">
        <h2 className="font-serif text-4xl font-black text-white">Settings</h2>
        <p className="mt-2 text-white/55">
          Configure restaurant details, delivery, payments and tax.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h3 className="mb-4 text-xl font-black text-white">
            Restaurant Details
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={settings.restaurantName || ""}
              onChange={(e) => updateField("restaurantName", e.target.value)}
              placeholder="Restaurant name"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={settings.logoUrl || ""}
              onChange={(e) => updateField("logoUrl", e.target.value)}
              placeholder="Logo URL"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={settings.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="Phone"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={settings.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="Email"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={settings.address || ""}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="Restaurant address"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none md:col-span-2"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h3 className="mb-4 text-xl font-black text-white">Opening Hours</h3>

          <div className="grid gap-4 md:grid-cols-2">
            {days.map(([key, label]) => (
              <div key={key}>
                <label className="mb-2 block text-sm font-bold text-white/50">
                  {label}
                </label>

                <input
                  value={settings.openingHours?.[key] || ""}
                  onChange={(e) => updateOpeningHours(key, e.target.value)}
                  placeholder="16:00 - 23:00"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h3 className="mb-4 text-xl font-black text-white">
            Delivery Settings
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={settings.deliveryZones || ""}
              onChange={(e) => updateField("deliveryZones", e.target.value)}
              placeholder="Delivery zones"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none md:col-span-3"
            />

            <input
              value={settings.deliveryFee || ""}
              onChange={(e) => updateField("deliveryFee", e.target.value)}
              placeholder="Delivery fee"
              type="number"
              step="0.01"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={settings.minimumOrder || ""}
              onChange={(e) => updateField("minimumOrder", e.target.value)}
              placeholder="Minimum order"
              type="number"
              step="0.01"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={settings.branchName || ""}
              onChange={(e) => updateField("branchName", e.target.value)}
              placeholder="Branch name"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h3 className="mb-4 text-xl font-black text-white">
            Payment / Tax Settings
          </h3>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={settings.stripePublicKey || ""}
              onChange={(e) => updateField("stripePublicKey", e.target.value)}
              placeholder="Stripe public key"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none md:col-span-3"
            />

            <input
              value={settings.vatRate || ""}
              onChange={(e) => updateField("vatRate", e.target.value)}
              placeholder="VAT rate %"
              type="number"
              step="0.01"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <input
              value={settings.serviceCharge || ""}
              onChange={(e) => updateField("serviceCharge", e.target.value)}
              placeholder="Service charge %"
              type="number"
              step="0.01"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3 text-white">
              <input
                type="checkbox"
                checked={Boolean(settings.stripeEnabled)}
                onChange={(e) => updateField("stripeEnabled", e.target.checked)}
              />
              Stripe Enabled
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h3 className="mb-4 text-xl font-black text-white">
            Notifications
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3 text-white">
              <input
                type="checkbox"
                checked={Boolean(settings.smsEnabled)}
                onChange={(e) => updateField("smsEnabled", e.target.checked)}
              />
              SMS Notifications
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3 text-white">
              <input
                type="checkbox"
                checked={Boolean(settings.emailNotifications)}
                onChange={(e) =>
                  updateField("emailNotifications", e.target.checked)
                }
              />
              Email Notifications
            </label>
          </div>
        </section>

        <button
          type="submit"
          className="rounded-xl bg-[#ff5b00] px-8 py-4 font-black text-white"
        >
          Save Settings
        </button>
      </div>
    </form>
  );
}