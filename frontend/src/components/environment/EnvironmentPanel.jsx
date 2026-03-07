import { useState } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ChevronRight,
  Check,
  Globe,
} from "lucide-react";
import { useEnvStore } from "../../store/index.js";
import { environmentsApi } from "../../utils/api.js";
import { generateId } from "../../utils/helpers.js";

export default function EnvironmentPanel() {
  const { environments, activeEnvId, setEnvironments, setActiveEnv } =
    useEnvStore();
  const [editingEnv, setEditingEnv] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function createEnv() {
    if (!newName.trim()) return;
    const env = await environmentsApi.create({
      name: newName.trim(),
      variables: [],
    });
    setEnvironments([...environments, env]);
    setNewName("");
    setCreating(false);
  }

  async function deleteEnv(id) {
    await environmentsApi.delete(id);
    setEnvironments(environments.filter((e) => e._id !== id));
    if (activeEnvId === id) setActiveEnv(null);
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
          Environments
        </span>
        <button
          onClick={() => setCreating(true)}
          className="p-1 rounded-md transition-colors hover:bg-(--bg-overlay)"
          style={{ color: "var(--accent)" }}
        >
          <Plus size={14} />
        </button>
      </div>

      {creating && (
        <div
          className="px-3 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createEnv();
              if (e.key === "Escape") {
                setCreating(false);
                setNewName("");
              }
            }}
            placeholder="Environment name..."
            className="w-full px-2.5 py-1.5 text-xs rounded-md outline-none"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--accent)",
              color: "var(--text-primary)",
            }}
          />
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={createEnv}
              className="flex-1 py-1 text-xs rounded-md font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              className="flex-1 py-1 text-xs rounded-md font-medium"
              style={{
                background: "var(--bg-overlay)",
                color: "var(--text-muted)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {environments.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
            <Globe size={20} style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No environments. Create one to use variables.
            </p>
          </div>
        )}

        {environments.map((env) => (
          <div key={env._id}>
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-(--bg-elevated) transition-colors group"
              onClick={() =>
                setEditingEnv(editingEnv?._id === env._id ? null : env)
              }
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveEnv(activeEnvId === env._id ? null : env._id);
                }}
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor:
                    activeEnvId === env._id ? "var(--accent)" : "var(--border)",
                  background:
                    activeEnvId === env._id ? "var(--accent)" : "transparent",
                }}
              >
                {activeEnvId === env._id && (
                  <Check size={9} className="text-white" />
                )}
              </button>
              <span
                className="flex-1 text-xs font-medium truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {env.name}
              </span>
              <span
                className="text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                {(env.variables || []).length} vars
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEnv(env._id);
                }}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/15"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 size={11} />
              </button>
            </div>

            {/* Edit variables inline */}
            {editingEnv?._id === env._id && (
              <EnvEditor
                env={env}
                onSave={(updated) => {
                  setEnvironments(
                    environments.map((e) =>
                      e._id === updated._id ? updated : e,
                    ),
                  );
                  if (editingEnv?._id === updated._id) setEditingEnv(updated);
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EnvEditor({ env, onSave }) {
  const [vars, setVars] = useState(env.variables || []);
  const [saving, setSaving] = useState(false);

  function updateVar(id, updates) {
    const updated = vars.map((v) =>
      v._id === id || v.id === id ? { ...v, ...updates } : v,
    );
    setVars(updated);
  }

  function deleteVar(id) {
    setVars(vars.filter((v) => v._id !== id && v.id !== id));
  }

  function addVar() {
    setVars([
      ...vars,
      { id: generateId(), key: "", value: "", enabled: true, secret: false },
    ]);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await environmentsApi.update(env._id, {
        ...env,
        variables: vars,
      });
      onSave(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="mx-2 mb-2 rounded-xl p-3 flex flex-col gap-2"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-wide font-medium"
          style={{ color: "var(--text-muted)" }}
        >
          Variables
        </span>
        <div className="flex gap-1">
          <button
            onClick={addVar}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors hover:bg-(--bg-overlay)"
            style={{ color: "var(--accent)" }}
          >
            <Plus size={10} /> Add
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <Check size={10} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {vars.length === 0 && (
        <p
          className="text-[10px] text-center py-2"
          style={{ color: "var(--text-muted)" }}
        >
          No variables yet
        </p>
      )}

      {vars.map((v) => {
        const id = v._id || v.id;
        return (
          <VarRow
            key={id}
            variable={v}
            onChange={(u) => updateVar(id, u)}
            onDelete={() => deleteVar(id)}
          />
        );
      })}
    </div>
  );
}

function VarRow({ variable, onChange, onDelete }) {
  const [showValue, setShowValue] = useState(false);

  return (
    <div className="flex items-center gap-1.5 group">
      <input
        type="checkbox"
        checked={variable.enabled !== false}
        onChange={(e) => onChange({ enabled: e.target.checked })}
        className="w-3 h-3 shrink-0 accent-(--accent)"
      />
      <input
        type="text"
        value={variable.key}
        onChange={(e) => onChange({ key: e.target.value })}
        placeholder="KEY"
        className="flex-1 px-2 py-1 text-[10px] font-mono rounded outline-none"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
      <div className="flex-1 relative">
        <input
          type={variable.secret && !showValue ? "password" : "text"}
          value={variable.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Value"
          className="w-full px-2 py-1 text-[10px] font-mono rounded outline-none pr-6"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {variable.secret && (
          <button
            onClick={() => setShowValue(!showValue)}
            className="absolute right-1 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            {showValue ? <EyeOff size={9} /> : <Eye size={9} />}
          </button>
        )}
      </div>
      <button
        onClick={() => onChange({ secret: !variable.secret })}
        className="text-[9px] px-1 py-0.5 rounded transition-colors"
        style={{
          background: variable.secret
            ? "var(--accent-subtle)"
            : "var(--bg-overlay)",
          color: variable.secret ? "var(--accent)" : "var(--text-muted)",
        }}
        title="Toggle secret"
      >
        {variable.secret ? <EyeOff size={9} /> : <Eye size={9} />}
      </button>
      <button
        onClick={onDelete}
        className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/15"
        style={{ color: "var(--text-muted)" }}
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}
