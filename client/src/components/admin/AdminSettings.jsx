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

  function updateOpeningHours(day, key, value) {
    setSettings((current) => ({
      ...current,
      openingHours: {
        ...current.openingHours,
        [day]: {
          ...(current.openingHours?.[day] || { open: "16:00", close: "23:00", closed: false }),
          [key]: value,
        },
      },
    }));
  }

  function updateDeliveryZone(index, field, value) {
    setSettings((current) => {
      const next = [...(current.deliveryZones || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...current, deliveryZones: next };
    });
  }

  function addDeliveryZone() {
    setSettings((current) => ({
      ...current,
      deliveryZones: [
        ...(current.deliveryZones || []),
        { area: "", fee: 0, keywords: [] },
      ],
    }));
  }

  function removeDeliveryZone(index) {
    setSettings((current) => ({
      ...current,
      deliveryZones: (current.deliveryZones || []).filter((_, i) => i !== index),
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
        deliveryZones: (settings.deliveryZones || []).map((zone) => ({
          area: zone.area || "",
          fee: Number(zone.fee || 0),
          keywords: Array.isArray(zone.keywords)
            ? zone.keywords
            : String(zone.keywords || "")
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean),
        })),
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
          <p className="mb-4 text-sm text-white/55">
            When the shop is closed, customers can still browse the menu but must schedule their order.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {days.map(([key, label]) => {
              const hours = settings.openingHours?.[key] || { open: "16:00", close: "23:00", closed: false };
              return (
                <div key={key} className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="font-bold text-white">{label}</label>
                    <label className="flex items-center gap-2 text-xs text-white/55">
                      <input
                        type="checkbox"
                        checked={Boolean(hours.closed)}
                        onChange={(e) => updateOpeningHours(key, "closed", e.target.checked)}
                      />
                      Closed
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      disabled={hours.closed}
                      value={hours.open || ""}
                      onChange={(e) => updateOpeningHours(key, "open", e.target.value)}
                      className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none disabled:opacity-40"
                    />
                    <input
                      type="time"
                      disabled={hours.closed}
                      value={hours.close || ""}
                      onChange={(e) => updateOpeningHours(key, "close", e.target.value)}
                      className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none disabled:opacity-40"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3 text-white">
            <input
              type="checkbox"
              checked={Boolean(settings.acceptScheduledOrders)}
              onChange={(e) => updateField("acceptScheduledOrders", e.target.checked)}
            />
            Accept pre-orders / scheduled orders when closed
          </label>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <h3 className="mb-4 text-xl font-black text-white">Delivery Zones & Charges</h3>
          <p className="mb-4 text-sm text-white/55">
            Set delivery charges per area. Keywords (comma separated) are matched against the customer's address to detect the zone automatically.
          </p>

          <div className="space-y-3">
            {(settings.deliveryZones || []).map((zone, index) => (
              <div key={index} className="grid gap-2 rounded-xl border border-white/10 bg-black/40 p-3 md:grid-cols-[1fr_120px_2fr_auto]">
                <input
                  value={zone.area || ""}
                  onChange={(e) => updateDeliveryZone(index, "area", e.target.value)}
                  placeholder="Area name (e.g. Kelty)"
                  className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  value={zone.fee ?? ""}
                  onChange={(e) => updateDeliveryZone(index, "fee", e.target.value)}
                  placeholder="Fee £"
                  className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none"
                />
                <input
                  value={Array.isArray(zone.keywords) ? zone.keywords.join(", ") : zone.keywords || ""}
                  onChange={(e) =>
                    updateDeliveryZone(
                      index,
                      "keywords",
                      e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="Keywords / postcodes (e.g. kelty, ky4 0)"
                  className="rounded-lg border border-white/10 bg-black px-3 py-2 text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeDeliveryZone(index)}
                  className="rounded-lg bg-red-600/80 px-3 py-2 font-black text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addDeliveryZone}
            className="mt-4 rounded-xl bg-[#ff5b00] px-5 py-3 font-black text-white"
          >
            + Add delivery zone
          </button>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input
              value={settings.minimumOrder || ""}
              onChange={(e) => updateField("minimumOrder", e.target.value)}
              placeholder="Minimum delivery order £"
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