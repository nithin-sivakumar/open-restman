import express from "express";
import { getDb } from "../db/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const history = await getDb().history.findAll();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const entry = await getDb().history.create(req.body);
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/", async (req, res) => {
  try {
    const result = await getDb().history.deleteAll();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await getDb().history.deleteOne(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
