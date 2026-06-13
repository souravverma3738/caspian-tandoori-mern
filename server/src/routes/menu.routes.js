import express from "express";
import { getPublicMenuItems, publicMenuShape } from "../services/menuPricing.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const items = await getPublicMenuItems();
    res.json({ categories: publicMenuShape(items), items });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not load menu" });
  }
});

export default router;
