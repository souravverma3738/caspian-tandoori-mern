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
