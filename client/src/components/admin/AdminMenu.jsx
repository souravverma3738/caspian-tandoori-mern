import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api";

const emptyItem = {
  name: "",
  category: "",
  description: "",
  basePrice: 0,
  displayOrder: 0,
  isEnabled: true,
  variants: [],
  optionGroups: [],
};

function moneyValue(value) {
  return Number(value || 0);
}

function blankVariant() {
  return { name: "", price: 0, displayOrder: 0, isEnabled: true };
}

function blankOption() {
  return { name: "", priceDelta: 0, displayOrder: 0, isEnabled: true };
}

function blankGroup() {
  return {
    name: "",
    isRequired: true,
    selectionType: "single",
    displayOrder: 0,
    showAfterPreviousAnswered: true,
    isEnabled: true,
    options: [],
  };
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-white/75">
      {label}
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#ff5b00]"
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-white/70">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#ff5b00]" />
      {label}
    </label>
  );
}

export default function AdminMenu() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyItem);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const categories = useMemo(
    () => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(),
    [items]
  );

  const visibleItems = items.filter((item) => {
    const q = search.trim().toLowerCase();
    return !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  async function loadMenu() {
    try {
      setLoading(true);
      const data = await adminApi.menu();
      setItems(data);
      if (!selectedId && data[0]) {
        setSelectedId(data[0]._id);
        setDraft(structuredClone(data[0]));
      }
    } catch (err) {
      setError(err.message || "Could not load menu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  function selectItem(item) {
    setSelectedId(item._id);
    setDraft(structuredClone(item));
    setMessage("");
    setError("");
  }

  function update(path, value) {
    setDraft((current) => {
      const next = structuredClone(current);
      let target = next;
      for (let i = 0; i < path.length - 1; i += 1) target = target[path[i]];
      target[path[path.length - 1]] = value;
      return next;
    });
  }

  async function save() {
    try {
      setMessage("");
      setError("");
      const payload = {
        ...draft,
        basePrice: moneyValue(draft.basePrice),
        variants: (draft.variants || []).map((variant) => ({ ...variant, price: moneyValue(variant.price) })),
        optionGroups: (draft.optionGroups || []).map((group) => ({
          ...group,
          options: (group.options || []).map((option) => ({ ...option, priceDelta: moneyValue(option.priceDelta) })),
        })),
      };
      const saved = selectedId
        ? await adminApi.updateMenuItem(selectedId, payload)
        : await adminApi.createMenuItem(payload);
      setSelectedId(saved._id);
      setDraft(structuredClone(saved));
      setMessage("Menu item saved.");
      await loadMenu();
    } catch (err) {
      setError(err.message || "Could not save menu item");
    }
  }

  async function remove() {
    if (!selectedId) return;
    if (!window.confirm("Delete this menu item? Existing orders will keep their saved snapshot.")) return;
    await adminApi.deleteMenuItem(selectedId);
    setSelectedId("");
    setDraft(emptyItem);
    setMessage("Menu item deleted.");
    await loadMenu();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-serif text-4xl font-black">Menu Builder</h2>
          <p className="mt-2 text-white/55">
            Manage live prices, sizes, option groups and customer questions.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedId("");
            setDraft(emptyItem);
          }}
          className="rounded-full bg-[#ff5b00] px-6 py-3 font-black text-white"
        >
          Add menu item
        </button>
      </div>

      {message && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">{message}</div>}
      {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-[#101010] p-4">
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu..." />
          <div className="mt-4 max-h-[660px] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <p className="text-white/55">Loading menu...</p>
            ) : visibleItems.map((item) => (
              <button
                key={item._id}
                onClick={() => selectItem(item)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedId === item._id ? "border-[#ff5b00] bg-[#ff5b00]/10" : "border-white/10 bg-black/30 hover:border-white/30"
                }`}
              >
                <p className="font-black text-white">{item.name}</p>
                <p className="mt-1 text-xs text-white/45">{item.category} - GBP {Number(item.basePrice || 0).toFixed(2)}</p>
                {item.isEnabled === false && <p className="mt-1 text-xs font-black text-amber-300">Disabled</p>}
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-[#101010] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Item name">
              <TextInput value={draft.name} onChange={(e) => update(["name"], e.target.value)} />
            </Field>
            <Field label="Category">
              <input
                value={draft.category}
                onChange={(e) => update(["category"], e.target.value)}
                list="menu-categories"
                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#ff5b00]"
              />
              <datalist id="menu-categories">
                {categories.map((category) => <option key={category} value={category} />)}
              </datalist>
            </Field>
            <Field label="Base price">
              <TextInput type="number" step="0.01" min="0" value={draft.basePrice} onChange={(e) => update(["basePrice"], e.target.value)} />
            </Field>
            <Field label="Display order">
              <TextInput type="number" value={draft.displayOrder} onChange={(e) => update(["displayOrder"], Number(e.target.value))} />
            </Field>
            <label className="grid gap-2 text-sm font-bold text-white/75 md:col-span-2">
              Description
              <textarea
                value={draft.description || ""}
                onChange={(e) => update(["description"], e.target.value)}
                className="min-h-24 rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#ff5b00]"
              />
            </label>
            <Toggle checked={draft.isEnabled !== false} onChange={(value) => update(["isEnabled"], value)} label="Enabled on customer menu" />
          </div>

          <EditorSection
            title="Sizes / Variants"
            actionLabel="Add size"
            onAdd={() => update(["variants"], [...(draft.variants || []), blankVariant()])}
          >
            {(draft.variants || []).map((variant, index) => (
              <div key={variant._id || index} className="grid gap-3 rounded-xl border border-white/10 bg-black/30 p-3 md:grid-cols-[1fr_120px_100px_auto]">
                <TextInput placeholder="Small / Medium / Large" value={variant.name} onChange={(e) => update(["variants", index, "name"], e.target.value)} />
                <TextInput type="number" step="0.01" min="0" value={variant.price} onChange={(e) => update(["variants", index, "price"], e.target.value)} />
                <TextInput type="number" value={variant.displayOrder} onChange={(e) => update(["variants", index, "displayOrder"], Number(e.target.value))} />
                <div className="flex gap-2">
                  <Toggle checked={variant.isEnabled !== false} onChange={(value) => update(["variants", index, "isEnabled"], value)} label="On" />
                  <button onClick={() => update(["variants"], draft.variants.filter((_, i) => i !== index))} className="rounded-xl border border-red-500/30 px-3 text-red-200">Delete</button>
                </div>
              </div>
            ))}
          </EditorSection>

          <EditorSection
            title="Option Groups"
            actionLabel="Add option group"
            onAdd={() => update(["optionGroups"], [...(draft.optionGroups || []), blankGroup()])}
          >
            {(draft.optionGroups || []).map((group, groupIndex) => (
              <div key={group._id || groupIndex} className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_140px_140px_120px]">
                  <TextInput placeholder="Size / Salad / Sauce / Extras" value={group.name} onChange={(e) => update(["optionGroups", groupIndex, "name"], e.target.value)} />
                  <select value={group.isRequired ? "required" : "optional"} onChange={(e) => update(["optionGroups", groupIndex, "isRequired"], e.target.value === "required")} className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white">
                    <option value="required">Required</option>
                    <option value="optional">Optional</option>
                  </select>
                  <select value={group.selectionType} onChange={(e) => update(["optionGroups", groupIndex, "selectionType"], e.target.value)} className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white">
                    <option value="single">Single choice</option>
                    <option value="multiple">Multiple choice</option>
                  </select>
                  <TextInput type="number" value={group.displayOrder} onChange={(e) => update(["optionGroups", groupIndex, "displayOrder"], Number(e.target.value))} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Toggle checked={group.showAfterPreviousAnswered !== false} onChange={(value) => update(["optionGroups", groupIndex, "showAfterPreviousAnswered"], value)} label="Show after previous answer" />
                  <Toggle checked={group.isEnabled !== false} onChange={(value) => update(["optionGroups", groupIndex, "isEnabled"], value)} label="Enabled" />
                  <button onClick={() => update(["optionGroups"], draft.optionGroups.filter((_, i) => i !== groupIndex))} className="rounded-xl border border-red-500/30 px-4 py-3 font-black text-red-200">Delete group</button>
                </div>
                <div className="mt-4 space-y-2">
                  {(group.options || []).map((option, optionIndex) => (
                    <div key={option._id || optionIndex} className="grid gap-2 rounded-xl border border-white/10 bg-black/40 p-3 md:grid-cols-[1fr_130px_100px_auto]">
                      <TextInput placeholder="Option name" value={option.name} onChange={(e) => update(["optionGroups", groupIndex, "options", optionIndex, "name"], e.target.value)} />
                      <TextInput type="number" step="0.01" min="0" value={option.priceDelta} onChange={(e) => update(["optionGroups", groupIndex, "options", optionIndex, "priceDelta"], e.target.value)} />
                      <TextInput type="number" value={option.displayOrder} onChange={(e) => update(["optionGroups", groupIndex, "options", optionIndex, "displayOrder"], Number(e.target.value))} />
                      <div className="flex gap-2">
                        <Toggle checked={option.isEnabled !== false} onChange={(value) => update(["optionGroups", groupIndex, "options", optionIndex, "isEnabled"], value)} label="On" />
                        <button onClick={() => update(["optionGroups", groupIndex, "options"], group.options.filter((_, i) => i !== optionIndex))} className="rounded-xl border border-red-500/30 px-3 text-red-200">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => update(["optionGroups", groupIndex, "options"], [...(group.options || []), blankOption()])} className="mt-3 rounded-full border border-[#ff5b00]/50 px-4 py-2 font-black text-[#ff5b00]">
                  Add option
                </button>
              </div>
            ))}
          </EditorSection>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={save} className="rounded-full bg-[#ff5b00] px-7 py-4 font-black text-white">Save menu item</button>
            {selectedId && <button onClick={remove} className="rounded-full border border-red-500/40 px-7 py-4 font-black text-red-200">Delete item</button>}
          </div>
        </section>
      </div>
    </div>
  );
}

function EditorSection({ title, actionLabel, onAdd, children }) {
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-serif text-2xl font-black">{title}</h3>
        <button onClick={onAdd} className="rounded-full border border-[#ff5b00]/50 px-4 py-2 font-black text-[#ff5b00]">
          {actionLabel}
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
