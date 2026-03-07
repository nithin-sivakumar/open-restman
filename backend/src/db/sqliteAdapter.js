import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, "../../../data");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, "restman.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#6366f1',
    icon TEXT,
    requests TEXT DEFAULT '[]',
    folders TEXT DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#10b981',
    variables TEXT DEFAULT '[]',
    isGlobal INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    method TEXT NOT NULL,
    url TEXT NOT NULL,
    status INTEGER,
    statusText TEXT,
    time INTEGER,
    size INTEGER,
    request TEXT,
    response TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

function findFolder(folders, id) {
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].id === id)
      return { folder: folders[i], parent: folders, index: i };
    const found = findFolder(folders[i].folders || [], id);
    if (found) return found;
  }
  return null;
}

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

function rowToCollection(row) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    requests: JSON.parse(row.requests || "[]"),
    folders: JSON.parse(row.folders || "[]"),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToEnvironment(row) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    color: row.color,
    variables: JSON.parse(row.variables || "[]"),
    isGlobal: !!row.isGlobal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToHistory(row) {
  if (!row) return null;
  return {
    _id: row.id,
    method: row.method,
    url: row.url,
    status: row.status,
    statusText: row.statusText,
    time: row.time,
    size: row.size,
    request: row.request ? JSON.parse(row.request) : null,
    response: row.response ? JSON.parse(row.response) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const collections = {
  async findAll() {
    const rows = db
      .prepare("SELECT * FROM collections ORDER BY updatedAt DESC")
      .all();
    return rows.map(rowToCollection);
  },
  async create(data) {
    const id = makeId();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO collections (id, name, description, color, icon, requests, folders, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      data.name,
      data.description || "",
      data.color || "#6366f1",
      data.icon || null,
      "[]",
      "[]",
      now,
      now,
    );
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
  async update(id, data) {
    const now = new Date().toISOString();
    const existing = db
      .prepare("SELECT * FROM collections WHERE id = ?")
      .get(id);
    if (!existing) return null;
    const merged = { ...rowToCollection(existing), ...data };
    db.prepare(
      `
      UPDATE collections SET name=?, description=?, color=?, icon=?, updatedAt=? WHERE id=?
    `,
    ).run(merged.name, merged.description, merged.color, merged.icon, now, id);
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
  async delete(id) {
    db.prepare("DELETE FROM collections WHERE id = ?").run(id);
    return { success: true };
  },
  async updateTree(id, { requests = [], folders = [] }) {
    requests.forEach((r) => {
      if (!r.id) r.id = makeId();
    });
    folders.forEach(stampIds);
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE collections SET requests=?, folders=?, updatedAt=? WHERE id=?",
    ).run(JSON.stringify(requests), JSON.stringify(folders), now, id);
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
  async addRequest(id, { request, folderId }) {
    const row = db.prepare("SELECT * FROM collections WHERE id = ?").get(id);
    if (!row) return null;
    const col = rowToCollection(row);
    const req = { ...request, id: request?.id || makeId() };
    if (folderId) {
      const found = findFolder(col.folders, folderId);
      if (!found) return null;
      found.folder.requests = [...(found.folder.requests || []), req];
    } else {
      col.requests.push(req);
    }
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE collections SET requests=?, folders=?, updatedAt=? WHERE id=?",
    ).run(JSON.stringify(col.requests), JSON.stringify(col.folders), now, id);
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
  async updateRequest(id, requestId, { updates }) {
    const row = db.prepare("SELECT * FROM collections WHERE id = ?").get(id);
    if (!row) return null;
    const col = rowToCollection(row);
    const rootIdx = col.requests.findIndex((r) => r.id === requestId);
    if (rootIdx !== -1) {
      col.requests[rootIdx] = {
        ...col.requests[rootIdx],
        ...updates,
        id: requestId,
      };
    } else {
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
      if (!updateInFolders(col.folders)) return null;
    }
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE collections SET requests=?, folders=?, updatedAt=? WHERE id=?",
    ).run(JSON.stringify(col.requests), JSON.stringify(col.folders), now, id);
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
  async addFolder(id, { folder, parentFolderId }) {
    const row = db.prepare("SELECT * FROM collections WHERE id = ?").get(id);
    if (!row) return null;
    const col = rowToCollection(row);
    const f = {
      ...folder,
      id: folder?.id || makeId(),
      requests: [],
      folders: [],
    };
    if (parentFolderId) {
      const found = findFolder(col.folders, parentFolderId);
      if (!found) return null;
      found.folder.folders = [...(found.folder.folders || []), f];
    } else {
      col.folders.push(f);
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE collections SET folders=?, updatedAt=? WHERE id=?").run(
      JSON.stringify(col.folders),
      now,
      id,
    );
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
  async updateFolder(id, folderId, data) {
    const row = db.prepare("SELECT * FROM collections WHERE id = ?").get(id);
    if (!row) return null;
    const col = rowToCollection(row);
    const found = findFolder(col.folders, folderId);
    if (!found) return null;
    const { name, color, icon, description } = data;
    if (name !== undefined) found.folder.name = name;
    if (color !== undefined) found.folder.color = color;
    if (icon !== undefined) found.folder.icon = icon;
    if (description !== undefined) found.folder.description = description;
    const now = new Date().toISOString();
    db.prepare("UPDATE collections SET folders=?, updatedAt=? WHERE id=?").run(
      JSON.stringify(col.folders),
      now,
      id,
    );
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
  async deleteFolder(id, folderId) {
    const row = db.prepare("SELECT * FROM collections WHERE id = ?").get(id);
    if (!row) return null;
    const col = rowToCollection(row);
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
    deleteFolder(col.folders, folderId);
    const now = new Date().toISOString();
    db.prepare("UPDATE collections SET folders=?, updatedAt=? WHERE id=?").run(
      JSON.stringify(col.folders),
      now,
      id,
    );
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
  async deleteRequest(id, requestId) {
    const row = db.prepare("SELECT * FROM collections WHERE id = ?").get(id);
    if (!row) return null;
    const col = rowToCollection(row);
    const rootIdx = col.requests.findIndex((r) => r.id === requestId);
    if (rootIdx !== -1) col.requests.splice(rootIdx, 1);
    else removeRequest(col.folders, requestId);
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE collections SET requests=?, folders=?, updatedAt=? WHERE id=?",
    ).run(JSON.stringify(col.requests), JSON.stringify(col.folders), now, id);
    return rowToCollection(
      db.prepare("SELECT * FROM collections WHERE id = ?").get(id),
    );
  },
};

export const environments = {
  async findAll() {
    const rows = db
      .prepare("SELECT * FROM environments ORDER BY updatedAt DESC")
      .all();
    return rows.map(rowToEnvironment);
  },
  async create(data) {
    const id = makeId();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO environments (id, name, color, variables, isGlobal, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      data.name,
      data.color || "#10b981",
      JSON.stringify(data.variables || []),
      data.isGlobal ? 1 : 0,
      now,
      now,
    );
    return rowToEnvironment(
      db.prepare("SELECT * FROM environments WHERE id = ?").get(id),
    );
  },
  async update(id, data) {
    const existing = db
      .prepare("SELECT * FROM environments WHERE id = ?")
      .get(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const merged = { ...rowToEnvironment(existing), ...data };
    db.prepare(
      `
      UPDATE environments SET name=?, color=?, variables=?, isGlobal=?, updatedAt=? WHERE id=?
    `,
    ).run(
      merged.name,
      merged.color,
      JSON.stringify(merged.variables || []),
      merged.isGlobal ? 1 : 0,
      now,
      id,
    );
    return rowToEnvironment(
      db.prepare("SELECT * FROM environments WHERE id = ?").get(id),
    );
  },
  async delete(id) {
    db.prepare("DELETE FROM environments WHERE id = ?").run(id);
    return { success: true };
  },
};

export const history = {
  async findAll() {
    const rows = db
      .prepare("SELECT * FROM history ORDER BY createdAt DESC LIMIT 200")
      .all();
    return rows.map(rowToHistory);
  },
  async create(data) {
    const id = makeId();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO history (id, method, url, status, statusText, time, size, request, response, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      id,
      data.method,
      data.url,
      data.status ?? null,
      data.statusText ?? null,
      data.time ?? null,
      data.size ?? null,
      data.request ? JSON.stringify(data.request) : null,
      data.response ? JSON.stringify(data.response) : null,
      now,
      now,
    );
    return rowToHistory(
      db.prepare("SELECT * FROM history WHERE id = ?").get(id),
    );
  },
  async deleteAll() {
    db.prepare("DELETE FROM history").run();
    return { success: true };
  },
  async deleteOne(id) {
    db.prepare("DELETE FROM history WHERE id = ?").run(id);
    return { success: true };
  },
};
