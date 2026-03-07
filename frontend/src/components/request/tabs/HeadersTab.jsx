import { Plus, Trash2, Zap } from "lucide-react";
import { useTabStore } from "../../../store/index.js";
import { generateId } from "../../../utils/helpers.js";
import VariableInput from "../URLInput.jsx";
import HeaderValueInput from "./inputs/HeaderValueInput.jsx";

const COMMON_HEADERS = [
  "Content-Type",
  "Authorization",
  "Accept",
  "Accept-Language",
  "Cache-Control",
  "X-Request-ID",
  "X-API-Key",
  "User-Agent",
];

const CONTENT_TYPES = [
  "application/json",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
  "text/html",
  "application/xml",
];

export default function HeadersTab({ tab }) {
  const { updateTab } = useTabStore();
  const headers = tab?.headers || [];

  function updateRow(id, updates) {
    const updated = headers.map((h) =>
      h.id === id ? { ...h, ...updates } : h,
    );
    const last = updated[updated.length - 1];
    if (last?.key)
      updated.push({ id: generateId(), key: "", value: "", enabled: true });
    updateTab(tab.id, { headers: updated });
  }

  function deleteRow(id) {
    const updated = headers.filter((h) => h.id !== id);
    if (!updated.length)
      updated.push({ id: generateId(), key: "", value: "", enabled: true });
    updateTab(tab.id, { headers: updated });
  }

  function addRow() {
    updateTab(tab.id, {
      headers: [
        ...headers,
        { id: generateId(), key: "", value: "", enabled: true },
      ],
    });
  }

  function addPreset(key, value = "") {
    // Check if the header already exists (case-insensitive)
    const existingIndex = headers.findIndex(
      (h) => h.key.toLowerCase() === key.toLowerCase(),
    );

    let updated;
    if (existingIndex > -1) {
      // Update the existing header
      updated = [...headers];
      updated[existingIndex] = {
        ...updated[existingIndex],
        value,
        enabled: true,
      };
    } else {
      // Add as a new header
      updated = [...headers, { id: generateId(), key, value, enabled: true }];
    }
    let temp = updated.filter((h) => h.key.trim());
    updateTab(tab.id, { headers: temp });
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Request Headers
        </span>
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors hover:bg-(--bg-overlay)"
          style={{ color: "var(--accent)" }}
        >
          <Plus size={11} /> Add
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-1 mb-2">
        {["JSON", "Form", "XML"].map((preset) => (
          <button
            key={preset}
            onClick={() =>
              addPreset(
                "Content-Type",
                preset === "JSON"
                  ? "application/json"
                  : preset === "Form"
                    ? "application/x-www-form-urlencoded"
                    : "application/xml",
              )
            }
            className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
            style={{
              background: "var(--bg-overlay)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <Zap size={9} />
            {preset}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-2 px-5">
        <span
          className="flex-1 text-[10px] uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          Key
        </span>
        <span
          className="flex-1 text-[10px] uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          Value
        </span>
        <div className="w-6" />
      </div>

      {headers.map((row) => {
        const isDuplicate =
          headers.filter(
            (h) =>
              h.key.toLowerCase() === row.key.toLowerCase() && h.key !== "",
          ).length > 1;

        return (
          <div key={row.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
              className="w-3.5 h-3.5 rounded shrink-0 accent-(--accent)"
            />
            <input
              type="text"
              value={row.key}
              onChange={(e) => updateRow(row.id, { key: e.target.value })}
              placeholder="Header name"
              list="header-keys"
              className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none transition-colors placeholder:text-(--text-muted)"
              style={{
                border: isDuplicate
                  ? "1px solid var(--error-color, red)"
                  : "1px solid var(--border)",
                background: "var(--bg-input)",
                color: "var(--text-primary)",
              }}
            />
            {/* <input
              type="text"
              value={row.value}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
              placeholder="Value"
              className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none transition-colors placeholder:text-(--text-muted)"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            /> */}
            <HeaderValueInput
              value={row.value}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
              placeholder="Value"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
              }}
            />
            <button
              onClick={() => deleteRow(row.id)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/15"
              style={{ color: "var(--text-muted)" }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}

      <datalist id="header-keys">
        {COMMON_HEADERS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
    </div>
  );
}
