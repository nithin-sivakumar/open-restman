// src/utils/api.js
import axios from "axios";

const BASE = "/api";
const api = axios.create({ baseURL: BASE });

// ─── Collections ──────────────────────────────────────────────────────────────
export const collectionsApi = {
  getAll: () => api.get("/collections").then((r) => r.data),
  create: (data) => api.post("/collections", data).then((r) => r.data),
  update: (id, data) => api.put(`/collections/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/collections/${id}`).then((r) => r.data),

  // Save entire tree (requests + folders) at once — used for DnD reorder
  saveTree: (id, data) =>
    api.put(`/collections/${id}/tree`, data).then((r) => r.data),

  // Add request to root or a specific folder
  addRequest: (id, request, folderId = null) =>
    api
      .post(`/collections/${id}/requests`, { request, folderId })
      .then((r) => r.data),

  // Update an existing saved request
  updateRequest: (collectionId, requestId, updates) =>
    api
      .put(`/collections/${collectionId}/requests/${requestId}`, { updates })
      .then((r) => r.data),

  // Delete a request
  deleteRequest: (collectionId, requestId) =>
    api
      .delete(`/collections/${collectionId}/requests/${requestId}`)
      .then((r) => r.data),

  // Add folder to root or a parent folder
  addFolder: (id, folder, parentFolderId = null) =>
    api
      .post(`/collections/${id}/folders`, { folder, parentFolderId })
      .then((r) => r.data),

  // Update folder metadata
  updateFolder: (collectionId, folderId, updates) =>
    api
      .put(`/collections/${collectionId}/folders/${folderId}`, updates)
      .then((r) => r.data),

  // Delete folder
  deleteFolder: (collectionId, folderId) =>
    api
      .delete(`/collections/${collectionId}/folders/${folderId}`)
      .then((r) => r.data),
};

// ─── Environments ─────────────────────────────────────────────────────────────
export const environmentsApi = {
  getAll: () => api.get("/environments").then((r) => r.data),
  create: (data) => api.post("/environments", data).then((r) => r.data),
  update: (id, data) =>
    api.put(`/environments/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/environments/${id}`).then((r) => r.data),
};

// ─── History ──────────────────────────────────────────────────────────────────
export const historyApi = {
  getAll: () => api.get("/history").then((r) => r.data),
  add: (data) => api.post("/history", data).then((r) => r.data),
  clear: () => api.delete("/history").then((r) => r.data),
  delete: (id) => api.delete(`/history/${id}`).then((r) => r.data),
};

// ─── Proxy Request ────────────────────────────────────────────────────────────
export async function sendProxyRequest({
  url,
  method,
  headers,
  body,
  bodyType,
  formFields,
  files,
}) {
  const fd = new FormData();
  fd.append("url", url);
  fd.append("method", method);
  fd.append(
    "headers",
    JSON.stringify(
      headers
        .filter((h) => h.enabled && h.key)
        .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
    ),
  );
  fd.append("bodyType", bodyType || "none");

  if (bodyType === "formdata") {
    fd.append(
      "formFields",
      JSON.stringify(formFields?.filter((f) => f.enabled && f.key) || []),
    );
    files?.forEach((f) => {
      if (f.file) fd.append(f.key, f.file, f.file.name);
    });
  } else if (bodyType === "urlencoded") {
    fd.append(
      "body",
      JSON.stringify(formFields?.filter((f) => f.enabled && f.key) || []),
    );
  } else if (body) {
    fd.append("body", body);
  }

  const response = await axios.post(`${BASE}/proxy`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });

  return response.data;
}
