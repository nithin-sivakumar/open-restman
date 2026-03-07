// backend/routes/collections.js
import express from "express";
import Collection from "../models/Collection.js";

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Deep-clone and stamp IDs on any node missing one */
function stampIds(node) {
  if (!node.id) node.id = makeId();
  if (Array.isArray(node.folders)) node.folders.forEach(stampIds);
  if (Array.isArray(node.requests)) {
    node.requests.forEach((r) => {
      if (!r.id) r.id = makeId();
    });
  }
  return node;
}

/** Find a folder anywhere in the tree by id. Returns { folder, parent (array) } */
function findFolder(folders, id) {
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].id === id)
      return { folder: folders[i], parent: folders, index: i };
    const found = findFolder(folders[i].folders || [], id);
    if (found) return found;
  }
  return null;
}

/** Remove a request by id from anywhere in the tree */
function removeRequest(folders, requestId) {
  for (const f of folders) {
    const idx = (f.requests || []).findIndex((r) => r.id === requestId);
    if (idx !== -1) {
      f.requests.splice(idx, 1);
      return true;
    }
    if (removeRequest(f.folders || [], requestId)) return true;
  }
  return false;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET all collections
router.get("/", async (req, res) => {
  try {
    const collections = await Collection.find().sort({ updatedAt: -1 });
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create collection
router.post("/", async (req, res) => {
  try {
    const col = new Collection({ ...req.body, requests: [], folders: [] });
    await col.save();
    res.status(201).json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update collection metadata (name, color, icon, description)
router.put("/:id", async (req, res) => {
  try {
    const col = await Collection.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { returnDocument: "after" },
    );
    if (!col) return res.status(404).json({ error: "Not found" });
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE collection
router.delete("/:id", async (req, res) => {
  try {
    await Collection.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /tree — replace entire requests+folders tree (bulk save / DnD reorder)
router.put("/:id/tree", async (req, res) => {
  try {
    const { requests = [], folders = [] } = req.body;
    // Stamp any missing IDs
    requests.forEach((r) => {
      if (!r.id) r.id = makeId();
    });
    folders.forEach(stampIds);

    const col = await Collection.findByIdAndUpdate(
      req.params.id,
      { requests, folders, updatedAt: new Date() },
      { returnDocument: "after" },
    );
    if (!col) return res.status(404).json({ error: "Not found" });
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST add request to collection root or a folder
// Body: { request, folderId? }
router.post("/:id/requests", async (req, res) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ error: "Not found" });

    const request = {
      ...req.body.request,
      id: req.body.request?.id || makeId(),
    };
    const folderId = req.body.folderId;

    const requests = col.requests ? [...col.requests] : [];
    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];

    if (folderId) {
      const found = findFolder(folders, folderId);
      if (!found) return res.status(404).json({ error: "Folder not found" });
      found.folder.requests = [...(found.folder.requests || []), request];
    } else {
      requests.push(request);
    }

    col.requests = requests;
    col.folders = folders;
    col.markModified("requests");
    col.markModified("folders");
    await col.save();
    res.status(201).json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update a saved request anywhere in the tree
// Body: { requestId, updates, folderId? }
router.put("/:id/requests/:requestId", async (req, res) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ error: "Not found" });

    const { updates } = req.body;
    const requestId = req.params.requestId;

    const requests = col.requests
      ? JSON.parse(JSON.stringify(col.requests))
      : [];
    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];

    // Try root level first
    const rootIdx = requests.findIndex((r) => r.id === requestId);
    if (rootIdx !== -1) {
      requests[rootIdx] = { ...requests[rootIdx], ...updates, id: requestId };
      col.requests = requests;
      col.folders = folders;
      col.markModified("requests");
      await col.save();
      return res.json(col);
    }

    // Try inside folders recursively
    function updateInFolders(foldersArr) {
      for (const f of foldersArr) {
        const idx = (f.requests || []).findIndex((r) => r.id === requestId);
        if (idx !== -1) {
          f.requests[idx] = { ...f.requests[idx], ...updates, id: requestId };
          return true;
        }
        if (updateInFolders(f.folders || [])) return true;
      }
      return false;
    }

    if (!updateInFolders(folders)) {
      return res.status(404).json({ error: "Request not found in collection" });
    }

    col.requests = requests;
    col.folders = folders;
    col.markModified("folders");
    await col.save();
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST add folder (to root or parent folder)
// Body: { folder, parentFolderId? }
router.post("/:id/folders", async (req, res) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ error: "Not found" });

    const folder = {
      ...req.body.folder,
      id: req.body.folder?.id || makeId(),
      requests: [],
      folders: [],
    };
    const parentFolderId = req.body.parentFolderId;

    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];

    if (parentFolderId) {
      const found = findFolder(folders, parentFolderId);
      if (!found)
        return res.status(404).json({ error: "Parent folder not found" });
      found.folder.folders = [...(found.folder.folders || []), folder];
    } else {
      folders.push(folder);
    }

    col.folders = folders;
    col.markModified("folders");
    await col.save();
    res.status(201).json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update folder metadata (name, color, icon, description)
router.put("/:id/folders/:folderId", async (req, res) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ error: "Not found" });

    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];
    const found = findFolder(folders, req.params.folderId);
    if (!found) return res.status(404).json({ error: "Folder not found" });

    const { name, color, icon, description } = req.body;
    if (name !== undefined) found.folder.name = name;
    if (color !== undefined) found.folder.color = color;
    if (icon !== undefined) found.folder.icon = icon;
    if (description !== undefined) found.folder.description = description;

    col.folders = folders;
    col.markModified("folders");
    await col.save();
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE folder anywhere in tree
router.delete("/:id/folders/:folderId", async (req, res) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ error: "Not found" });

    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];

    function deleteFolder(arr, fid) {
      const idx = arr.findIndex((f) => f.id === fid);
      if (idx !== -1) {
        arr.splice(idx, 1);
        return true;
      }
      for (const f of arr) {
        if (deleteFolder(f.folders || [], fid)) return true;
      }
      return false;
    }

    deleteFolder(folders, req.params.folderId);
    col.folders = folders;
    col.markModified("folders");
    await col.save();
    res.json(col);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE request anywhere in tree
// Query: ?folderId=xxx (optional, speeds up search)
router.delete("/:id/requests/:requestId", async (req, res) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return res.status(404).json({ error: "Not found" });

    const requestId = req.params.requestId;
    const requests = col.requests
      ? JSON.parse(JSON.stringify(col.requests))
      : [];
    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];

    // Try root first
    const rootIdx = requests.findIndex((r) => r.id === requestId);
    if (rootIdx !== -1) requests.splice(rootIdx, 1);
    else removeRequest(folders, requestId);

    col.requests = requests;
    col.folders = folders;
    col.markModified("requests");
    col.markModified("folders");
    await col.save();
    res.json(col);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
