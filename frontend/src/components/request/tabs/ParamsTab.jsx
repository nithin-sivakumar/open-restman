import { Plus, Trash2 } from "lucide-react";
import { useEnvStore, useTabStore } from "../../../store/index.js";
import { generateId } from "../../../utils/helpers.js";

function KVRow({ row, onChange, onDelete, placeholder }) {
  return (
    <div className="flex items-center gap-2 group">
      <input
        type="checkbox"
        checked={row.enabled}
        onChange={(e) => onChange({ ...row, enabled: e.target.checked })}
        className="w-3.5 h-3.5 rounded shrink-0 accent-(--accent)"
      />
      <input
        type="text"
        value={row.key}
        onChange={(e) => onChange({ ...row, key: e.target.value })}
        placeholder={placeholder?.key || "Key"}
        className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none transition-colors placeholder:text-(--text-muted)"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
      <input
        type="text"
        value={row.value}
        onChange={(e) => onChange({ ...row, value: e.target.value })}
        placeholder={placeholder?.value || "Value"}
        className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none transition-colors placeholder:text-(--text-muted)"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
      <button
        onClick={onDelete}
        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/15"
        style={{ color: "var(--text-muted)" }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export default function ParamsTab({ tab }) {
  const { resolveVariables, unresolveVariables } = useEnvStore();
  const { updateTab } = useTabStore();
  const params = tab?.params || [];

  function updateRow(id, updates) {
    const updated = params.map((p) => (p.id === id ? { ...p, ...updates } : p));

    const last = updated[updated.length - 1];
    if (last?.key) {
      updated.push({ id: generateId(), key: "", value: "", enabled: true });
    }

    const newUrl = new URL(resolveVariables(tab.url) || tab.url);

    // --- THE FIX ---
    // Clear all existing parameters so we start with a blank slate
    newUrl.search = "";

    updated.forEach((p) => {
      // Only add if there's a key and the row is enabled
      if (p.key && p.enabled !== false) {
        newUrl.searchParams.set(p.key, p.value);
      }
    });

    updateTab(tab.id, {
      params: updated,
      url: unresolveVariables(newUrl.toString()),
    });
  }

  function deleteRow(id) {
    const updated = params.filter((p) => p.id !== id);
    if (!updated.length)
      updated.push({ id: generateId(), key: "", value: "", enabled: true });
    updateTab(tab.id, { params: updated });
  }

  function addRow() {
    updateTab(tab.id, {
      params: [
        ...params,
        { id: generateId(), key: "", value: "", enabled: true },
      ],
    });
  }

  return (
    <div className="p-3 flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-xs font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Query Parameters
        </span>
        <button
          onClick={addRow}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors hover:bg-(--bg-overlay)"
          style={{ color: "var(--accent)" }}
        >
          <Plus size={11} /> Add
        </button>
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

      {/* Rows */}
      {params.map((row) => (
        <KVRow
          key={row.id}
          row={row}
          onChange={(updated) => updateRow(row.id, updated)}
          onDelete={() => deleteRow(row.id)}
        />
      ))}

      {params.length === 0 && (
        <div
          className="text-center py-6 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          No query parameters. Click Add to get started.
        </div>
      )}
    </div>
  );
}
