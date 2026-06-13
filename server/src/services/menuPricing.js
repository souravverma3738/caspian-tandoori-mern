import MenuItem from "../models/MenuItem.js";
import { defaultCategories } from "../data/defaultMenu.js";

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function saneMoney(value, fallback = 0) {
  const amount = roundMoney(value);
  if (!Number.isFinite(amount) || amount < 0) return roundMoney(fallback);
  return amount > 500 ? roundMoney(fallback) : amount;
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function option(name, priceDelta = 0, displayOrder = 0) {
  return { name, priceDelta, displayOrder, isEnabled: true };
}

function group(name, options, config = {}) {
  return {
    name,
    isRequired: config.isRequired ?? true,
    selectionType: config.selectionType || "single",
    displayOrder: config.displayOrder || 0,
    showAfterPreviousAnswered: config.showAfterPreviousAnswered ?? true,
    isEnabled: true,
    options,
  };
}

function defaultVariants(category, basePrice) {
  if (category === "Pizzas") {
    return [
      { name: '10"', price: roundMoney(basePrice), displayOrder: 1, isEnabled: true },
      { name: '12"', price: roundMoney(basePrice + 2), displayOrder: 2, isEnabled: true },
      { name: '16"', price: roundMoney(basePrice + 5.5), displayOrder: 3, isEnabled: true },
      { name: '10" Stuffed Crust', price: roundMoney(basePrice + 1.7), displayOrder: 4, isEnabled: true },
      { name: '12" Stuffed Crust', price: roundMoney(basePrice + 4.2), displayOrder: 5, isEnabled: true },
      { name: '16" Stuffed Crust', price: roundMoney(basePrice + 8.7), displayOrder: 6, isEnabled: true },
    ];
  }
  if (category === "Calzone") {
    return [
      { name: '7"', price: roundMoney(basePrice), displayOrder: 1, isEnabled: true },
      { name: '10"', price: roundMoney(basePrice + 2.5), displayOrder: 2, isEnabled: true },
      { name: '12"', price: roundMoney(basePrice + 4), displayOrder: 3, isEnabled: true },
      { name: '16"', price: roundMoney(basePrice + 9), displayOrder: 4, isEnabled: true },
    ];
  }
  return [];
}

function defaultCalzoneBasePrice(name, currentPrice) {
  if (name === "Calzone Donner Meat") return 7;
  return roundMoney(currentPrice);
}

function repairVariantPrice(item, variant) {
  const basePrice = defaultCalzoneBasePrice(item.name, item.basePrice);
  if (item.category !== "Calzone") return saneMoney(variant.price, basePrice);

  const byName = {
    '7"': basePrice,
    '10"': basePrice + 2.5,
    '12"': basePrice + 4,
    '16"': basePrice + 9,
  };
  return saneMoney(variant.price, byName[variant.name] ?? basePrice);
}

function defaultOptionGroups(category) {
  const salad = group("Salad Option", [option("Salad"), option("No Salad")], { displayOrder: 20 });
  const sauce = group("Sauce Option", [
    option("Chilli Sauce"),
    option("Garlic Sauce"),
    option("Pakora Sauce"),
    option("Mint Sauce"),
    option("BBQ Sauce"),
    option("No Sauce"),
  ], { displayOrder: 30 });
  const extras = group("Extras", [
    option("Cheese", 1),
    option("Extra Donner", 1.5),
    option("Extra Chicken", 1.5),
  ], { isRequired: false, selectionType: "multiple", displayOrder: 40 });

  if (category === "Grilled Burgers") {
    return [
      group("Single or Meal", [option("Single"), option("Meal", 2)], { displayOrder: 10 }),
      salad,
      sauce,
    ];
  }
  if (["Hoagies & Wraps", "Kebabs", "Naan Kebabs"].includes(category)) {
    return [salad, sauce, extras];
  }
  if (category === "Omelette") {
    return [group("Extras", [
      option("Cheese", 1.2),
      option("Ham", 1.2),
      option("Mushroom", 1.2),
      option("Onion", 1.2),
      option("Chicken Tikka", 1.2),
    ], { isRequired: false, selectionType: "multiple", displayOrder: 10 })];
  }
  if (category === "Nutella Pizza") {
    return [group("Toppings", [
      option("Kinder Bueno", 1),
      option("Snickers", 1),
      option("Mars", 1),
      option("Biscoff", 1),
      option("Maltesers", 1),
    ], { isRequired: false, selectionType: "multiple", displayOrder: 10 })];
  }
  return [];
}

export function publicMenuShape(items) {
  const sorted = [...items].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  const categories = [];
  for (const item of sorted) {
    let category = categories.find((entry) => entry.name === item.category);
    if (!category) {
      category = { id: slug(item.category), name: item.category, items: [] };
      categories.push(category);
    }
    category.items.push(item);
  }
  return categories;
}

export async function ensureDefaultMenu() {
  const count = await MenuItem.countDocuments();
  if (count > 0) {
    await maintainSeededMenu();
    return;
  }

  const docs = [];
  defaultCategories.forEach(([category, items], categoryIndex) => {
    items.forEach(([name, price, description], itemIndex) => {
      docs.push({
        sourceKey: `${slug(category)}-${slug(name)}`,
        name,
        description,
        category,
        basePrice: category === "Calzone" ? defaultCalzoneBasePrice(name, price) : roundMoney(price),
        displayOrder: categoryIndex * 1000 + itemIndex,
        isEnabled: true,
        variants: defaultVariants(category, category === "Calzone" ? defaultCalzoneBasePrice(name, price) : price),
        optionGroups: defaultOptionGroups(category),
      });
    });
  });

  await MenuItem.insertMany(docs);
}

async function maintainSeededMenu() {
  const calzones = await MenuItem.find({ category: "Calzone" });

  for (const item of calzones) {
    const basePrice = defaultCalzoneBasePrice(item.name, item.basePrice);
    let changed = false;

    if (roundMoney(item.basePrice) !== basePrice) {
      item.basePrice = basePrice;
      changed = true;
    }

    const existingByName = new Map((item.variants || []).map((variant) => [variant.name, variant]));
    const desired = defaultVariants("Calzone", basePrice);
    const nextVariants = desired.map((template) => {
      const existing = existingByName.get(template.name);
      if (!existing) {
        changed = true;
        return template;
      }
      const repairedPrice = repairVariantPrice(item, existing);
      if (
        roundMoney(existing.price) !== repairedPrice ||
        existing.isEnabled === false ||
        Number(existing.displayOrder || 0) !== template.displayOrder
      ) {
        changed = true;
      }
      existing.price = repairedPrice;
      existing.displayOrder = template.displayOrder;
      existing.isEnabled = true;
      return existing;
    });

    const oldNames = new Set((item.variants || []).map((variant) => variant.name));
    const desiredNames = new Set(desired.map((variant) => variant.name));
    if ([...oldNames].some((name) => !desiredNames.has(name))) changed = true;
    item.variants = nextVariants;

    if (changed) await item.save();
  }
}

function enabledSorted(values = []) {
  return values
    .filter((item) => item.isEnabled !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export async function getPublicMenuItems() {
  await ensureDefaultMenu();
  const items = await MenuItem.find({ isEnabled: true }).lean();
  return items.map((item) => ({
    ...item,
    variants: enabledSorted(item.variants),
    optionGroups: enabledSorted(item.optionGroups).map((group) => ({
      ...group,
      options: enabledSorted(group.options),
    })).filter((group) => group.options.length > 0),
  }));
}

export async function verifyAndPriceCartItems(cartItems = []) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error("Basket is empty");
  }

  const verified = [];

  for (const cartItem of cartItems) {
    const qty = Math.max(1, Number(cartItem.qty || 1));
    const itemId = cartItem.menuItemId || cartItem._id || cartItem.id;
    const menuItem = await MenuItem.findOne({ _id: itemId, isEnabled: true }).lean();
    if (!menuItem) throw new Error(`Menu item is no longer available: ${cartItem.name || itemId}`);

    const enabledVariants = enabledSorted(menuItem.variants);
    const hasVariants = enabledVariants.length > 0;
    const variantId = cartItem.variantId || cartItem.variant?._id || cartItem.variant?.id;
    let selectedVariant = null;
    let unitPrice = roundMoney(menuItem.basePrice);

    if (hasVariants) {
      selectedVariant = enabledVariants.find((variant) => String(variant._id) === String(variantId));
      if (!selectedVariant) throw new Error(`Please choose a size for ${menuItem.name}`);
      unitPrice = roundMoney(selectedVariant.price);
    }

    const selectedGroups = [];
    const selectedOptionIds = new Set(
      (cartItem.selectedOptions || cartItem.options || [])
        .flatMap((entry) => entry.optionIds || entry.options?.map((opt) => opt.optionId || opt._id || opt.id) || entry.optionId || entry.id || [])
        .map(String)
    );

    for (const groupDoc of enabledSorted(menuItem.optionGroups)) {
      const enabledOptions = enabledSorted(groupDoc.options);
      if (enabledOptions.length === 0) continue;
      const picked = enabledOptions.filter((optionDoc) => selectedOptionIds.has(String(optionDoc._id)));

      if (groupDoc.isRequired && picked.length === 0) {
        throw new Error(`Please choose ${groupDoc.name} for ${menuItem.name}`);
      }
      if (groupDoc.selectionType === "single" && picked.length > 1) {
        throw new Error(`Choose only one option for ${groupDoc.name}`);
      }

      if (picked.length > 0) {
        picked.forEach((optionDoc) => {
          unitPrice = roundMoney(unitPrice + Number(optionDoc.priceDelta || 0));
        });
        selectedGroups.push({
          groupId: String(groupDoc._id),
          groupName: groupDoc.name,
          selectionType: groupDoc.selectionType,
          options: picked.map((optionDoc) => ({
            optionId: String(optionDoc._id),
            name: optionDoc.name,
            priceDelta: roundMoney(optionDoc.priceDelta),
          })),
        });
      }
    }

    verified.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: unitPrice,
      qty,
      category: menuItem.category,
      variant: selectedVariant
        ? {
            variantId: String(selectedVariant._id),
            name: selectedVariant.name,
            price: roundMoney(selectedVariant.price),
          }
        : null,
      selectedOptions: selectedGroups,
      pricingSnapshot: {
        basePrice: roundMoney(menuItem.basePrice),
        unitPrice,
      },
    });
  }

  return verified;
}
