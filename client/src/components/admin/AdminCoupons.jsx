import { useEffect, useState } from "react";
import { adminCouponApi } from "../../api";

const emptyForm = {
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  startDate: "",
  expiryDate: "",
  usageLimit: "",
  perCustomerUsageLimit: "",
  isActive: true,
  isWebsiteOffer: false,
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB");
}

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadCoupons() {
    try {
      setLoading(true);
      setCoupons(await adminCouponApi.list());
    } catch (err) {
      setError(err.message || "Could not load coupons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
  }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount || 0),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perCustomerUsageLimit: form.perCustomerUsageLimit
          ? Number(form.perCustomerUsageLimit)
          : null,
      };
      if (editingId) await adminCouponApi.update(editingId, payload);
      else await adminCouponApi.create(payload);
      setMessage(editingId ? "Discount updated." : "Discount created.");
      resetForm();
      await loadCoupons();
    } catch (err) {
      setError(err.message || "Could not save discount");
    }
  }

  function editCoupon(coupon) {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code || "",
      title: coupon.title || "",
      description: coupon.description || "",
      discountType: coupon.discountType || "percentage",
      discountValue: coupon.discountValue || "",
      minOrderAmount: coupon.minOrderAmount || "",
      startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : "",
      expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0, 10) : "",
      usageLimit: coupon.usageLimit || "",
      perCustomerUsageLimit: coupon.perCustomerUsageLimit || "",
      isActive: coupon.isActive !== false,
      isWebsiteOffer: Boolean(coupon.isWebsiteOffer),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deactivate(couponId) {
    await adminCouponApi.deactivate(couponId);
    await loadCoupons();
  }

  async function remove(couponId) {
    if (!confirm("Delete this discount?")) return;
    await adminCouponApi.remove(couponId);
    await loadCoupons();
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-4xl font-black text-white">Coupons</h2>
        <p className="mt-2 text-white/55">
          Create discount codes and website-wide offers. Discounts do not stack.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="mb-8 rounded-2xl border border-white/10 bg-[#101010] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-2xl font-black">
            {editingId ? "Edit Discount" : "Create Discount"}
          </h3>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded-full border border-white/10 px-4 py-2 font-bold">
              Cancel edit
            </button>
          )}
        </div>

        <label className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3 font-bold">
          <input
            type="checkbox"
            checked={form.isWebsiteOffer}
            onChange={(e) => updateField("isWebsiteOffer", e.target.checked)}
            className="accent-[#ff5b00]"
          />
          Website-wide automatic offer
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          {!form.isWebsiteOffer && (
            <input
              value={form.code}
              onChange={(e) => updateField("code", e.target.value.toUpperCase())}
              placeholder="Coupon code e.g. SAVE10"
              className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
            />
          )}
          <input
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Offer title"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
          <select
            value={form.discountType}
            onChange={(e) => updateField("discountType", e.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
          <input
            type="number"
            step="0.01"
            required
            value={form.discountValue}
            onChange={(e) => updateField("discountValue", e.target.value)}
            placeholder={form.discountType === "percentage" ? "Discount % e.g. 10" : "Discount £ e.g. 5"}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
          <input
            type="number"
            step="0.01"
            value={form.minOrderAmount}
            onChange={(e) => updateField("minOrderAmount", e.target.value)}
            placeholder="Minimum order £"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => updateField("startDate", e.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => updateField("expiryDate", e.target.value)}
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
          <input
            type="number"
            value={form.usageLimit}
            onChange={(e) => updateField("usageLimit", e.target.value)}
            placeholder="Total usage limit"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
          <input
            type="number"
            value={form.perCustomerUsageLimit}
            onChange={(e) => updateField("perCustomerUsageLimit", e.target.value)}
            placeholder="Per customer limit"
            className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
          />
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-4 py-3 font-bold">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateField("isActive", e.target.checked)}
              className="accent-[#ff5b00]"
            />
            Active
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Description e.g. 10% off opening offer"
            className="min-h-24 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none md:col-span-3"
          />
        </div>

        <button type="submit" className="mt-5 rounded-xl bg-[#ff5b00] px-6 py-3 font-black text-white">
          {editingId ? "Update Discount" : "Create Discount"}
        </button>
      </form>

      {loading ? (
        <p className="text-white/60">Loading discounts...</p>
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => (
            <div key={coupon._id} className="rounded-2xl border border-white/10 bg-[#101010] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black text-white">
                      {coupon.isWebsiteOffer ? coupon.title || "Website offer" : coupon.code}
                    </h3>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/65">
                      {coupon.isWebsiteOffer ? "Website offer" : "Coupon"}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${
                      coupon.statusLabel === "Active"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-red-500/20 text-red-200"
                    }`}>
                      {coupon.statusLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-white/55">{coupon.description || "No description"}</p>
                  <div className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2 lg:grid-cols-4">
                    <p>Discount: <b className="text-white">{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : money(coupon.discountValue)}</b></p>
                    <p>Minimum: <b className="text-white">{money(coupon.minOrderAmount)}</b></p>
                    <p>Starts: <b className="text-white">{formatDate(coupon.startDate)}</b></p>
                    <p>Expires: <b className="text-white">{formatDate(coupon.expiryDate)}</b></p>
                    <p>Used: <b className="text-white">{coupon.usedCount || 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</b></p>
                    <p>Customer limit: <b className="text-white">{coupon.perCustomerUsageLimit || "-"}</b></p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => editCoupon(coupon)} className="rounded-xl bg-white px-4 py-3 font-black text-black">
                    Edit
                  </button>
                  <button onClick={() => deactivate(coupon._id)} className="rounded-xl border border-amber-500/40 px-4 py-3 font-black text-amber-200">
                    Deactivate
                  </button>
                  <button onClick={() => remove(coupon._id)} className="rounded-xl bg-red-600 px-4 py-3 font-black text-white">
                    Delete
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
