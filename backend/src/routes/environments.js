import express from "express";
import { getDb } from "../db/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const envs = await getDb().environments.findAll();
    res.json(envs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const env = await getDb().environments.create(req.body);
    res.status(201).json(env);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const env = await getDb().environments.update(req.params.id, req.body);
    if (!env) return res.status(404).json({ error: "Not found" });
    res.json(env);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await getDb().environments.delete(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
