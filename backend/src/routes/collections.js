import express from "express";
import { getDb } from "../db/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const collections = await getDb().collections.findAll();
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const col = await getDb().collections.create(req.body);
    res.status(201).json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const col = await getDb().collections.update(req.params.id, req.body);
    if (!col) return res.status(404).json({ error: "Not found" });
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await getDb().collections.delete(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id/tree", async (req, res) => {
  try {
    const col = await getDb().collections.updateTree(req.params.id, req.body);
    if (!col) return res.status(404).json({ error: "Not found" });
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/requests", async (req, res) => {
  try {
    const col = await getDb().collections.addRequest(req.params.id, req.body);
    if (!col) return res.status(404).json({ error: "Not found" });
    res.status(201).json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/requests/:requestId", async (req, res) => {
  try {
    const col = await getDb().collections.updateRequest(
      req.params.id,
      req.params.requestId,
      req.body,
    );
    if (!col) return res.status(404).json({ error: "Not found" });
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/folders", async (req, res) => {
  try {
    const col = await getDb().collections.addFolder(req.params.id, req.body);
    if (!col) return res.status(404).json({ error: "Not found" });
    res.status(201).json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id/folders/:folderId", async (req, res) => {
  try {
    const col = await getDb().collections.updateFolder(
      req.params.id,
      req.params.folderId,
      req.body,
    );
    if (!col) return res.status(404).json({ error: "Not found" });
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id/folders/:folderId", async (req, res) => {
  try {
    const col = await getDb().collections.deleteFolder(
      req.params.id,
      req.params.folderId,
    );
    if (!col) return res.status(404).json({ error: "Not found" });
    res.json(col);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/requests/:requestId", async (req, res) => {
  try {
    const col = await getDb().collections.deleteRequest(
      req.params.id,
      req.params.requestId,
    );
    if (!col) return res.status(404).json({ error: "Not found" });
    res.json(col);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
