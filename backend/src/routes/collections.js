import express from "express";
import Collection from "../models/Collection.js";
import { v4 as uuidv4 } from "../utils/uuid.js";

const router = express.Router();

// Get all collections
router.get("/", async (req, res) => {
  try {
    const collections = await Collection.find().sort({ updatedAt: -1 });
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create collection
router.post("/", async (req, res) => {
  try {
    const collection = new Collection({
      ...req.body,
      requests: [],
      folders: [],
    });
    await collection.save();
    res.status(201).json(collection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update collection
router.put("/:id", async (req, res) => {
  try {
    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { returnDocument: "after" },
    );
    if (!collection) return res.status(404).json({ error: "Not found" });
    res.json(collection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete collection
router.delete("/:id", async (req, res) => {
  try {
    await Collection.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add request to collection
router.post("/:id/requests", async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: "Not found" });
    const request = { ...req.body, id: Date.now().toString() };
    collection.requests.push(request);
    await collection.save();
    res.status(201).json(collection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add folder to collection
router.post("/:id/folders", async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ error: "Not found" });
    const folder = { ...req.body, id: Date.now().toString(), requests: [] };
    collection.folders.push(folder);
    await collection.save();
    res.status(201).json(collection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Save full collection tree (bulk update)
router.put("/:id/tree", async (req, res) => {
  try {
    const { requests, folders } = req.body;
    const collection = await Collection.findByIdAndUpdate(
      req.params.id,
      { requests, folders, updatedAt: new Date() },
      { returnDocument: "after" },
    );
    if (!collection) return res.status(404).json({ error: "Not found" });
    res.json(collection);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
