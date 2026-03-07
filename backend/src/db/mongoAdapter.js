import Collection from "../models/Collection.js";
import Environment from "../models/Environment.js";
import History from "../models/History.js";

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

export const collections = {
  async findAll() {
    return Collection.find().sort({ updatedAt: -1 });
  },
  async create(data) {
    const col = new Collection({ ...data, requests: [], folders: [] });
    await col.save();
    return col;
  },
  async update(id, data) {
    return Collection.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { returnDocument: "after" },
    );
  },
  async delete(id) {
    await Collection.findByIdAndDelete(id);
    return { success: true };
  },
  async updateTree(id, { requests = [], folders = [] }) {
    requests.forEach((r) => {
      if (!r.id) r.id = makeId();
    });
    folders.forEach(stampIds);
    return Collection.findByIdAndUpdate(
      id,
      { requests, folders, updatedAt: new Date() },
      { returnDocument: "after" },
    );
  },
  async addRequest(id, { request, folderId }) {
    const col = await Collection.findById(id);
    if (!col) return null;
    const req = { ...request, id: request?.id || makeId() };
    const requests = col.requests ? [...col.requests] : [];
    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];
    if (folderId) {
      const found = findFolder(folders, folderId);
      if (!found) return null;
      found.folder.requests = [...(found.folder.requests || []), req];
    } else {
      requests.push(req);
    }
    col.requests = requests;
    col.folders = folders;
    col.markModified("requests");
    col.markModified("folders");
    await col.save();
    return col;
  },
  async updateRequest(id, requestId, { updates }) {
    const col = await Collection.findById(id);
    if (!col) return null;
    const requests = col.requests
      ? JSON.parse(JSON.stringify(col.requests))
      : [];
    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];
    const rootIdx = requests.findIndex((r) => r.id === requestId);
    if (rootIdx !== -1) {
      requests[rootIdx] = { ...requests[rootIdx], ...updates, id: requestId };
      col.requests = requests;
      col.markModified("requests");
      await col.save();
      return col;
    }
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
    if (!updateInFolders(folders)) return null;
    col.requests = requests;
    col.folders = folders;
    col.markModified("folders");
    await col.save();
    return col;
  },
  async addFolder(id, { folder, parentFolderId }) {
    const col = await Collection.findById(id);
    if (!col) return null;
    const f = {
      ...folder,
      id: folder?.id || makeId(),
      requests: [],
      folders: [],
    };
    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];
    if (parentFolderId) {
      const found = findFolder(folders, parentFolderId);
      if (!found) return null;
      found.folder.folders = [...(found.folder.folders || []), f];
    } else {
      folders.push(f);
    }
    col.folders = folders;
    col.markModified("folders");
    await col.save();
    return col;
  },
  async updateFolder(id, folderId, data) {
    const col = await Collection.findById(id);
    if (!col) return null;
    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];
    const found = findFolder(folders, folderId);
    if (!found) return null;
    const { name, color, icon, description } = data;
    if (name !== undefined) found.folder.name = name;
    if (color !== undefined) found.folder.color = color;
    if (icon !== undefined) found.folder.icon = icon;
    if (description !== undefined) found.folder.description = description;
    col.folders = folders;
    col.markModified("folders");
    await col.save();
    return col;
  },
  async deleteFolder(id, folderId) {
    const col = await Collection.findById(id);
    if (!col) return null;
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
    deleteFolder(folders, folderId);
    col.folders = folders;
    col.markModified("folders");
    await col.save();
    return col;
  },
  async deleteRequest(id, requestId) {
    const col = await Collection.findById(id);
    if (!col) return null;
    const requests = col.requests
      ? JSON.parse(JSON.stringify(col.requests))
      : [];
    const folders = col.folders ? JSON.parse(JSON.stringify(col.folders)) : [];
    const rootIdx = requests.findIndex((r) => r.id === requestId);
    if (rootIdx !== -1) requests.splice(rootIdx, 1);
    else removeRequest(folders, requestId);
    col.requests = requests;
    col.folders = folders;
    col.markModified("requests");
    col.markModified("folders");
    await col.save();
    return col;
  },
};

export const environments = {
  async findAll() {
    return Environment.find().sort({ updatedAt: -1 });
  },
  async create(data) {
    const env = new Environment(data);
    await env.save();
    return env;
  },
  async update(id, data) {
    return Environment.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { returnDocument: "after" },
    );
  },
  async delete(id) {
    await Environment.findByIdAndDelete(id);
    return { success: true };
  },
};

export const history = {
  async findAll() {
    return History.find().sort({ createdAt: -1 }).limit(200);
  },
  async create(data) {
    const entry = new History(data);
    await entry.save();
    return entry;
  },
  async deleteAll() {
    await History.deleteMany({});
    return { success: true };
  },
  async deleteOne(id) {
    await History.findByIdAndDelete(id);
    return { success: true };
  },
};
