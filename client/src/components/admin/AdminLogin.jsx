import { useState } from "react";
import { authApi, setSession } from "../../api";

export default function AdminLogin({ go, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authApi.signin({ email, password });
      if (data.user?.role !== "admin") {
        throw new Error("Admin access only");
      }
      setSession(data.token, data.user);
      setUser(data.user);
      go("admin");
    } catch (err) {
      setError(err.message || "Invalid admin credentials");
    } finally {
      setLoading(false);
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

        <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 p-3 rounded text-white font-bold">
          {loading ? "Checking..." : "Login"}
        </button>
      </form>
    </div>
  );
}
