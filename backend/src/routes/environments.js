import express from "express";
import Environment from "../models/Environment.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const envs = await Environment.find().sort({ updatedAt: -1 });
    res.json(envs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const env = new Environment(req.body);
    await env.save();
    res.status(201).json(env);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const env = await Environment.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { returnDocument: "after" },
    );
    if (!env) return res.status(404).json({ error: "Not found" });
    res.json(env);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Environment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
