const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export function getToken() {
  return localStorage.getItem("caspian_token");
}

export function setSession(token, user) {
  localStorage.setItem("caspian_token", token);
  localStorage.setItem("caspian_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("caspian_token");
  localStorage.removeItem("caspian_user");
}

export function getStoredUser() {
  const user = localStorage.getItem("caspian_user");
  return user ? JSON.parse(user) : null;
}

export async function apiRequest(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const authApi = {
  signup: (payload) => apiRequest("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  signin: (payload) => apiRequest("/auth/signin", { method: "POST", body: JSON.stringify(payload) }),
  google: (payload) => apiRequest("/auth/google", { method: "POST", body: JSON.stringify(payload) })
};

export const userApi = {
  me: () => apiRequest("/users/me"),
  updateMe: (payload) => apiRequest("/users/me", { method: "PUT", body: JSON.stringify(payload) }),
  addAddress: (payload) => apiRequest("/users/addresses", { method: "POST", body: JSON.stringify(payload) }),
  deleteAddress: (addressId) => apiRequest(`/users/addresses/${addressId}`, { method: "DELETE" })
};

export const orderApi = {
  create: (payload) => apiRequest("/orders", { method: "POST", body: JSON.stringify(payload) }),
  myOrders: () => apiRequest("/orders/my-orders")
};
export const menuApi = {
  list: () => apiRequest("/menu"),
};
export const adminApi = {
  dashboard: () => apiRequest("/admin/dashboard"),
  menu: () => apiRequest("/admin/menu"),
  createMenuItem: (payload) =>
    apiRequest("/admin/menu", { method: "POST", body: JSON.stringify(payload) }),
  updateMenuItem: (itemId, payload) =>
    apiRequest(`/admin/menu/${itemId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMenuItem: (itemId) =>
    apiRequest(`/admin/menu/${itemId}`, { method: "DELETE" }),
  orders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/orders${query ? `?${query}` : ""}`);
  },
  updateOrderStatus: (orderId, status) =>
    apiRequest(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),
  setEstimatedTime: (orderId, minutes) =>
    apiRequest(`/admin/orders/${orderId}/estimate`, {
      method: "PATCH",
      body: JSON.stringify({ minutes }),
    }),
  customers: (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return apiRequest(`/admin/customers${query ? `?${query}` : ""}`);
},
banCustomer: (customerId) =>
  apiRequest(`/admin/customers/${customerId}/ban`, { method: "PATCH" }),
unbanCustomer: (customerId) =>
  apiRequest(`/admin/customers/${customerId}/unban`, { method: "PATCH" }),
  staffAttendance: () => apiRequest("/admin/staff-attendance"),

clockInStaff: (payload) =>
  apiRequest("/admin/staff-attendance/clock-in", {
    method: "POST",
    body: JSON.stringify(payload),
  }),

startBreak: (recordId) =>
  apiRequest(`/admin/staff-attendance/${recordId}/break-start`, {
    method: "PATCH",
  }),

endBreak: (recordId) =>
  apiRequest(`/admin/staff-attendance/${recordId}/break-end`, {
    method: "PATCH",
  }),

clockOutStaff: (recordId) =>
  apiRequest(`/admin/staff-attendance/${recordId}/clock-out`, {
    method: "PATCH",
  }),
  temperatureLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/temperature-logs${query ? `?${query}` : ""}`);
  },

  createTemperatureLog: (payload) =>
    apiRequest("/admin/temperature-logs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  temperatureAlerts: () => apiRequest("/admin/temperature-alerts"),

  settings: () => apiRequest("/admin/settings"),

updateSettings: (payload) =>
  apiRequest("/admin/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  };

export const paymentApi = {
  createCheckoutSession: (payload) =>
    apiRequest("/payments/create-checkout-session", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifySession: (sessionId) =>
    apiRequest(`/payments/verify-session/${encodeURIComponent(sessionId)}`),
};

export const couponApi = {
  activeOffer: () => apiRequest("/coupons/active-offer"),
  validate: (payload) =>
    apiRequest("/coupons/validate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const adminCouponApi = {
  list: () => apiRequest("/admin/coupons"),
  create: (payload) =>
    apiRequest("/admin/coupons", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (couponId, payload) =>
    apiRequest(`/admin/coupons/${couponId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deactivate: (couponId) =>
    apiRequest(`/admin/coupons/${couponId}/deactivate`, { method: "PATCH" }),
  remove: (couponId) =>
    apiRequest(`/admin/coupons/${couponId}`, { method: "DELETE" }),
};

export const adminPaymentApi = {
  verifySession: paymentApi.verifySession,
};
export const settingsApi = {
  get: () => apiRequest("/settings"),
  shopStatus: () => apiRequest("/settings/shop-status"),
  deliveryQuote: (address) =>
    apiRequest("/settings/delivery-quote", {
      method: "POST",
      body: JSON.stringify({ address }),
    }),
};
