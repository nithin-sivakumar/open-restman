import express from "express";
import History from "../models/History.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const history = await History.find().sort({ createdAt: -1 }).limit(200);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const entry = new History(req.body);
    await entry.save();
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    await History.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await History.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
