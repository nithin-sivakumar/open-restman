import { useState } from "react";
import { Trash2, Clock, Search } from "lucide-react";
import {
  useEnvStore,
  useHistoryStore,
  useTabStore,
} from "../../store/index.js";
import { historyApi } from "../../utils/api.js";
import {
  getMethodColor,
  formatTime,
  getStatusBg,
} from "../../utils/helpers.js";

export default function HistoryPanel() {
  const { history, clearHistory, setHistory } = useHistoryStore();
  const { openOrAddTab } = useTabStore();
  const { unresolveVariables } = useEnvStore();
  const [search, setSearch] = useState("");

  const filtered = history.filter(
    (h) =>
      h.url?.toLowerCase().includes(search.toLowerCase()) ||
      h.method?.toLowerCase().includes(search.toLowerCase()),
  );

  async function clear() {
    await historyApi.clear();
    clearHistory();
    setHistory([]);
  }

  function openInTab(entry) {
    const filteredHeaders = entry.request?.headers?.filter(
      (h) => h.key !== "Authorization",
    );
    openOrAddTab({
      method: entry.method,
      url: unresolveVariables(entry.url), // Unresolve first!
      headers: filteredHeaders || [],
      bodyType: entry.request?.bodyType,
      body: entry.request?.body,
      formFields: entry.request?.formFields,
      auth: entry.request?.auth,
      params: entry.request?.params,
      name: entry.request?.name || entry.url,
      customName: entry.request?.customName,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          History
        </span>
        {history.length > 0 && (
          <button
            onClick={clear}
            className="p-1 rounded-md transition-colors hover:bg-red-500/15"
            style={{ color: "var(--text-muted)" }}
            title="Clear history"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Search */}
      {history.length > 0 && (
        <div
          className="px-3 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div
            className="flex items-center gap-2 px-2.5 rounded-lg"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
            }}
          >
            <Search size={11} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history..."
              className="flex-1 py-1.5 text-xs bg-transparent outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Clock size={20} style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {history.length === 0 ? "No requests yet" : "No matches"}
            </p>
          </div>
        )}

        {filtered.map((entry) => (
          <div
            key={entry._id}
            onClick={() => openInTab(entry)}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-(--bg-elevated) transition-colors group"
          >
            <span
              className={`text-[9px] font-bold shrink-0 w-10 text-right ${getMethodColor(entry.method)}`}
            >
              {entry.method}
            </span>
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] truncate font-mono"
                style={{ color: "var(--text-secondary)" }}
              >
                {entry.request?.name || entry.url}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {entry.status && (
                  <span
                    className={`text-[9px] px-1 rounded ${getStatusBg(entry.status)}`}
                  >
                    {entry.status}
                  </span>
                )}
                {entry.time && (
                  <span
                    className="text-[9px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatTime(entry.time)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
