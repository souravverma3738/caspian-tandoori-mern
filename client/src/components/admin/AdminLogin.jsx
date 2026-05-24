import { useState } from "react";

export default function AdminLogin({ go, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (
      email === import.meta.env.VITE_ADMIN_EMAIL &&
      password === import.meta.env.VITE_ADMIN_PASSWORD
    ) {
      const adminUser = { name: "Admin", email, role: "admin" };
      localStorage.setItem("token", "admin-token");
      localStorage.setItem("caspian_token", "admin-token");
      localStorage.setItem("caspian_user", JSON.stringify(adminUser));
      setUser(adminUser);
      go("admin");
    } else {
      setError("Invalid admin credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <form onSubmit={handleLogin} className="bg-zinc-900 p-8 rounded-xl w-[350px]">
        <h1 className="text-2xl font-bold mb-6 text-white">Admin Login</h1>

        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-zinc-800 text-white"
        />

        <input
          type="password"
          placeholder="Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 rounded bg-zinc-800 text-white"
        />

        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 p-3 rounded text-white font-bold">
          Login
        </button>
      </form>
    </div>
  );
}