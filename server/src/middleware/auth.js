import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = header.split(" ")[1];

    // hardcoded admin token support
    if (token === "admin-token") {
      req.user = {
        _id: "admin",
        name: "Admin",
        email: process.env.ADMIN_EMAIL,
        role: "admin",
      };
      return next();
    }

    // normal user JWT support
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}