// src/components/ui/CommandPalette.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Globe,
  Wifi,
  Folder,
  Clock,
  Plus,
  Settings,
  PanelLeft,
  Zap,
} from "lucide-react";
import {
  useTabStore,
  useCollectionStore,
  useHistoryStore,
  useUIStore,
} from "../../store/index.js";
import { generateId } from "../../utils/helpers.js";
import Portal from "./Portal.jsx";

function flattenCollection(col) {
  const items = [];
  function walkFolder(folder, path, colId) {
    (folder.requests || []).forEach((req) => {
      items.push({
        type: "request",
        req,
        collectionId: colId,
        folderId: folder.id,
        path: `${path} / ${folder.name}`,
      });
    });
    (folder.folders || []).forEach((sub) =>
      walkFolder(sub, `${path} / ${folder.name}`, colId),
    );
  }
  (col.requests || []).forEach((req) =>
    items.push({
      type: "request",
      req,
      collectionId: col._id,
      folderId: null,
      path: col.name,
    }),
  );
  (col.folders || []).forEach((f) => walkFolder(f, col.name, col._id));
  return items;
}

export default function CommandPalette({ onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const [selected, setSelected] = useState(0);
  const { addTab, openOrAddTab } = useTabStore();
  const { collections } = useCollectionStore();
  const { history } = useHistoryStore();
  const { setSidebarCollapsed, sidebarCollapsed } = useUIStore();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allRequests = useMemo(
    () => collections.flatMap(flattenCollection),
    [collections],
  );

  const staticActions = [
    {
      type: "action",
      label: "New HTTP Request",
      icon: Globe,
      action: () => {
        addTab({ type: "http", method: "GET", name: "New Request" });
        onClose();
      },
    },
    {
      type: "action",
      label: "New WebSocket",
      icon: Wifi,
      action: () => {
        addTab({ type: "websocket", name: "New WebSocket", method: "WS" });
        onClose();
      },
    },
    {
      type: "action",
      label: "Toggle Sidebar (Ctrl+B)",
      icon: PanelLeft,
      action: () => {
        setSidebarCollapsed(!sidebarCollapsed);
        onClose();
      },
    },
  ];

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [...staticActions, ...allRequests.slice(0, 8)];
    const actions = staticActions.filter((a) =>
      a.label.toLowerCase().includes(q),
    );
    const requests = allRequests.filter(
      (item) =>
        item.req.name.toLowerCase().includes(q) ||
        item.req.url?.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q),
    );
    const hist = history
      .filter(
        (h) =>
          h.url?.toLowerCase().includes(q) ||
          h.method?.toLowerCase().includes(q),
      )
      .slice(0, 3)
      .map((h) => ({ type: "history", item: h }));
    return [...actions, ...requests.slice(0, 10), ...hist];
  }, [query, allRequests, history, sidebarCollapsed]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  function activate(item) {
    if (!item) return;
    if (item.type === "action") {
      item.action();
      return;
    }
    if (item.type === "request") {
      openOrAddTab({
        name: item.req.name,
        method: item.req.method || "GET",
        url: item.req.url || "",
        headers: item.req.headers?.length
          ? item.req.headers
          : [{ id: generateId(), key: "", value: "", enabled: true }],
        params: item.req.params?.length
          ? item.req.params
          : [{ id: generateId(), key: "", value: "", enabled: true }],
        bodyType: item.req.bodyType || "none",
        body: item.req.body || "",
        formFields: item.req.formFields?.length
          ? item.req.formFields
          : [
              {
                id: generateId(),
                key: "",
                value: "",
                type: "text",
                enabled: true,
              },
            ],
        auth: item.req.auth || { type: "none" },
        type: item.req.type || "http",
        collectionId: item.collectionId,
        requestId: item.req.id,
        folderId: item.folderId,
        isDirty: false,
      });
      onClose();
    }
    if (item.type === "history") {
      addTab({
        method: item.item.method,
        url: item.item.url,
        name: item.item.url,
        type: "http",
      });
      onClose();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    }
    if (e.key === "Enter") {
      activate(filtered[selected]);
    }
  }

  const METHOD_COLORS = {
    GET: "text-emerald-400",
    POST: "text-blue-400",
    PUT: "text-amber-400",
    DELETE: "text-red-400",
    PATCH: "text-purple-400",
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-start justify-center pt-24"
        style={{
          zIndex: 20000,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <Search size={16} style={{ color: "var(--text-muted)" }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search requests, collections, actions…"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--text-primary)" }}
            />
            <kbd
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: "var(--bg-overlay)",
                color: "var(--text-muted)",
              }}
            >
              ESC
            </kbd>
          </div>
          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div
                className="px-4 py-8 text-center text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                No results found
              </div>
            )}
            {filtered.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                style={{
                  background:
                    i === selected ? "var(--bg-overlay)" : "transparent",
                }}
                onMouseEnter={() => setSelected(i)}
                onClick={() => activate(item)}
              >
                {item.type === "action" && (
                  <>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "var(--accent-subtle)" }}
                    >
                      <item.icon size={13} style={{ color: "var(--accent)" }} />
                    </div>
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {item.label}
                    </span>
                  </>
                )}
                {item.type === "request" && (
                  <>
                    <span
                      className={`text-[10px] font-bold w-9 shrink-0 ${item.req.type === "websocket" ? "text-emerald-400" : METHOD_COLORS[item.req.method] || "text-zinc-400"}`}
                    >
                      {item.req.type === "websocket" ? "WS" : item.req.method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.req.name}
                      </p>
                      <p
                        className="text-[10px] truncate"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {item.path} {item.req.url && `· ${item.req.url}`}
                      </p>
                    </div>
                    <Folder size={11} style={{ color: "var(--text-muted)" }} />
                  </>
                )}
                {item.type === "history" && (
                  <>
                    <Clock
                      size={13}
                      style={{ color: "var(--text-muted)" }}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs truncate font-mono"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.item.method} {item.item.url}
                      </p>
                    </div>
                    <span
                      className="text-[10px]"
                      style={{
                        color:
                          item.item.status < 400
                            ? "var(--success)"
                            : "var(--error)",
                      }}
                    >
                      {item.item.status}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
          <div
            className="px-4 py-2 flex items-center gap-4 text-[10px]"
            style={{
              borderTop: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>ESC close</span>
          </div>
        </div>
      </div>
    </Portal>
  );
}
