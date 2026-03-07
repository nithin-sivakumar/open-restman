// src/utils/helpers.js
import { clsx } from "clsx";

export function cn(...args) {
  return clsx(...args);
}

export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  if (!bytes) return "-";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatTime(ms) {
  if (!ms && ms !== 0) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function getStatusColor(status) {
  if (!status) return "text-[var(--text-muted)]";
  if (status >= 500) return "text-[var(--error)]";
  if (status >= 400) return "text-[var(--warning)]";
  if (status >= 300) return "text-[var(--info)]";
  if (status >= 200) return "text-[var(--success)]";
  return "text-[var(--text-muted)]";
}

export function getStatusBg(status) {
  if (!status) return "bg-[var(--bg-overlay)] text-[var(--text-muted)]";
  if (status >= 500) return "bg-red-500/15 text-[var(--error)]";
  if (status >= 400) return "bg-amber-500/15 text-[var(--warning)]";
  if (status >= 300) return "bg-blue-500/15 text-[var(--info)]";
  if (status >= 200) return "bg-emerald-500/15 text-[var(--success)]";
  return "bg-[var(--bg-overlay)] text-[var(--text-muted)]";
}

export function getMethodColor(method) {
  const colors = {
    GET: "text-emerald-400",
    POST: "text-blue-400",
    PUT: "text-amber-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
    HEAD: "text-cyan-400",
    OPTIONS: "text-pink-400",
  };
  return colors[method?.toUpperCase()] || "text-[var(--text-secondary)]";
}

export function getMethodBg(method) {
  const colors = {
    GET: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    POST: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    PUT: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    PATCH: "bg-purple-500/15 text-purple-400 border border-purple-500/25",
    DELETE: "bg-red-500/15 text-red-400 border border-red-500/25",
    HEAD: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25",
    OPTIONS: "bg-pink-500/15 text-pink-400 border border-pink-500/25",
  };
  return (
    colors[method?.toUpperCase()] ||
    "bg-[var(--bg-overlay)] text-[var(--text-secondary)]"
  );
}

export function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function prettifyJson(val) {
  try {
    if (typeof val === "string")
      return JSON.stringify(JSON.parse(val), null, 2);
    return JSON.stringify(val, null, 2);
  } catch {
    return val;
  }
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildUrlWithParams(url, params) {
  try {
    const activeParams = params.filter((p) => p.enabled && p.key);
    if (!activeParams.length) return url;
    const separator = url.includes("?") ? "&" : "?";
    const qs = activeParams
      .map(
        (p) =>
          `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || "")}`,
      )
      .join("&");
    return `${url}${separator}${qs}`;
  } catch {
    return url;
  }
}

export function parseUrlParams(url) {
  try {
    const u = new URL(url);
    const params = [];
    u.searchParams.forEach((value, key) => {
      params.push({ id: generateId(), key, value, enabled: true });
    });
    return params;
  } catch {
    return [];
  }
}
