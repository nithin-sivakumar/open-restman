import { useState, useEffect } from "react";
import {
  X,
  Palette,
  Monitor,
  Info,
  Plus,
  Trash2,
  Check,
  Database,
  AlertCircle,
} from "lucide-react";
import { useThemeStore } from "../../store/index.js";
import { BUILT_IN_THEMES, buildCustomTheme } from "../../themes/index.js";
import { generateId } from "../../utils/helpers.js";

const SETTINGS_TABS = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "storage", label: "Storage", icon: Database },
  { id: "about", label: "About", icon: Info },
];

export default function SettingsModal({ onClose }) {
  const [tab, setTab] = useState("appearance");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-4xl h-150 rounded-2xl shadow-2xl flex overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Sidebar */}
        <div
          className="w-48 shrink-0 flex flex-col p-3 gap-1"
          style={{
            borderRight: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          <div className="px-2 py-2 mb-2">
            <h2
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Settings
            </h2>
          </div>
          {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left"
              style={{
                background: tab === id ? "var(--bg-overlay)" : "transparent",
                color: tab === id ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {SETTINGS_TABS.find((t) => t.id === tab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-(--bg-overlay)"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {tab === "appearance" && <AppearanceSettings />}
            {tab === "storage" && <StorageSettings />}
            {tab === "about" && <AboutSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function StorageSettings() {
  const [currentEngine, setCurrentEngine] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((cfg) => {
        setCurrentEngine(cfg.dbEngine || "mongodb");
        setSelected(cfg.dbEngine || "mongodb");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/settings/db-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbEngine: selected }),
      });
      setCurrentEngine(selected);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  }

  const engines = [
    {
      id: "mongodb",
      name: "MongoDB",
      description:
        "Full-featured document database. Requires MongoDB to be installed and running.",
      badge: "Default",
    },
    {
      id: "sqlite",
      name: "Built-in (SQLite)",
      description:
        "Lightweight embedded database. No installation required. Data stored locally as a file.",
      badge: "No setup needed",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Loading...
        </span>
      </div>
    );
  }

  const hasChanges = selected !== currentEngine;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Choose your preferred database engine. Changes require a server
          restart to take effect.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {engines.map((engine) => (
          <button
            key={engine.id}
            onClick={() => setSelected(engine.id)}
            className="flex items-start gap-3 p-4 rounded-xl text-left transition-all"
            style={{
              background:
                selected === engine.id
                  ? "var(--bg-overlay)"
                  : "var(--bg-elevated)",
              border:
                selected === engine.id
                  ? "1.5px solid var(--accent)"
                  : "1.5px solid var(--border)",
            }}
          >
            <div
              className="w-4 h-4 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
              style={{
                border:
                  selected === engine.id ? "none" : "1.5px solid var(--border)",
                background:
                  selected === engine.id ? "var(--accent)" : "transparent",
              }}
            >
              {selected === engine.id && <Check size={10} color="white" />}
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {engine.name}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                  }}
                >
                  {engine.badge}
                </span>
                {currentEngine === engine.id && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: "var(--success)20",
                      color: "var(--success)",
                    }}
                  >
                    Active
                  </span>
                )}
              </div>
              <span
                className="text-xs leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {engine.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      {hasChanges && (
        <div
          className="flex items-start gap-2.5 p-3 rounded-lg"
          style={{
            background: "var(--warning)15",
            border: "1px solid var(--warning)40",
          }}
        >
          <AlertCircle
            size={14}
            style={{ color: "var(--warning)", marginTop: 1, shrink: 0 }}
          />
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--warning)" }}
          >
            Switching databases does not migrate existing data. After saving,
            restart the server for changes to take effect.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
          style={{
            background: hasChanges ? "var(--accent)" : "var(--bg-elevated)",
            color: hasChanges ? "white" : "var(--text-muted)",
            cursor: hasChanges ? "pointer" : "not-allowed",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <span
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--success)" }}
          >
            <Check size={12} />
            Saved — restart server to apply
          </span>
        )}
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const {
    currentThemeId,
    customThemes,
    setTheme,
    addCustomTheme,
    deleteCustomTheme,
    getAllThemes,
  } = useThemeStore();
  const [showBuilder, setShowBuilder] = useState(false);
  const [filter, setFilter] = useState("all");

  const all = getAllThemes();
  const filtered = all.filter((t) => filter === "all" || t.category === filter);
  const darkThemes = filtered.filter((t) => t.category === "dark");
  const lightThemes = filtered.filter((t) => t.category === "light");
  const customThemesList = filtered.filter((t) => t.category === "custom");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1">
        {["all", "dark", "light", "custom"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors"
            style={{
              background: filter === f ? "var(--accent)" : "var(--bg-elevated)",
              color: filter === f ? "white" : "var(--text-muted)",
              border: "1px solid var(--border)",
            }}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
          style={{
            background: "var(--accent-subtle)",
            color: "var(--accent)",
            border: "1px solid var(--accent)/30",
          }}
        >
          <Plus size={11} />
          Build Theme
        </button>
      </div>

      {showBuilder && (
        <ThemeBuilder
          onSave={(theme) => {
            addCustomTheme(theme);
            setTheme(theme.id);
            setShowBuilder(false);
          }}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {(filter === "all" || filter === "dark") && darkThemes.length > 0 && (
        <ThemeSection
          title="Dark Themes"
          themes={darkThemes}
          currentId={currentThemeId}
          onSelect={setTheme}
          onDelete={null}
        />
      )}
      {(filter === "all" || filter === "light") && lightThemes.length > 0 && (
        <ThemeSection
          title="Light Themes"
          themes={lightThemes}
          currentId={currentThemeId}
          onSelect={setTheme}
          onDelete={null}
        />
      )}
      {(filter === "all" || filter === "custom") &&
        customThemesList.length > 0 && (
          <ThemeSection
            title="Custom Themes"
            themes={customThemesList}
            currentId={currentThemeId}
            onSelect={setTheme}
            onDelete={deleteCustomTheme}
          />
        )}
      {filter === "custom" && customThemesList.length === 0 && (
        <div
          className="text-center py-8 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No custom themes yet. Click "Build Theme" to create one.
        </div>
      )}
    </div>
  );
}

function ThemeSection({ title, themes, currentId, onSelect, onDelete }) {
  return (
    <div>
      <h4
        className="text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </h4>
      <div className="grid grid-cols-4 gap-2.5">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={currentId === theme.id}
            onSelect={() => onSelect(theme.id)}
            onDelete={onDelete ? () => onDelete(theme.id) : null}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeCard({ theme, active, onSelect, onDelete }) {
  const v = theme.vars;
  return (
    <div
      onClick={onSelect}
      className="relative rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-105 group"
      style={{
        border: active ? `2px solid ${v["--accent"]}` : "2px solid transparent",
        boxShadow: active ? `0 0 12px ${v["--accent"]}40` : "none",
      }}
    >
      <div
        className="h-20 p-2 flex flex-col gap-1"
        style={{ background: v["--bg-base"] }}
      >
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-1.5 rounded-full"
            style={{ background: v["--accent"] }}
          />
          <div
            className="w-6 h-1.5 rounded-full"
            style={{ background: v["--bg-surface"] }}
          />
        </div>
        <div className="flex gap-1 flex-1">
          <div
            className="w-5 rounded-sm"
            style={{ background: v["--bg-surface"] }}
          />
          <div
            className="flex-1 rounded-sm flex flex-col gap-0.5 p-1"
            style={{ background: v["--bg-elevated"] }}
          >
            <div
              className="h-1 rounded-full w-full"
              style={{ background: v["--bg-overlay"] }}
            />
            <div
              className="h-1 rounded-full w-3/4"
              style={{ background: v["--accent"] + "80" }}
            />
            <div
              className="h-1 rounded-full w-1/2"
              style={{ background: v["--success"] + "60" }}
            />
          </div>
        </div>
      </div>
      <div
        className="px-2 py-1.5 flex items-center justify-between"
        style={{ background: v["--bg-surface"] }}
      >
        <span
          className="text-[10px] font-medium truncate"
          style={{ color: v["--text-primary"] }}
        >
          {theme.name}
        </span>
        {active && <Check size={10} style={{ color: v["--accent"] }} />}
      </div>
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1 right-1 p-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-all"
          style={{ background: "rgba(0,0,0,0.5)", color: "white" }}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

const VAR_LABELS = {
  "--bg-base": "Base Background",
  "--bg-surface": "Surface",
  "--bg-elevated": "Elevated",
  "--bg-overlay": "Overlay",
  "--bg-input": "Input Background",
  "--border": "Border",
  "--border-subtle": "Subtle Border",
  "--text-primary": "Primary Text",
  "--text-secondary": "Secondary Text",
  "--text-muted": "Muted Text",
  "--accent": "Accent",
  "--accent-hover": "Accent Hover",
  "--accent-subtle": "Accent Subtle",
  "--success": "Success",
  "--warning": "Warning",
  "--error": "Error",
  "--info": "Info",
};

function ThemeBuilder({ onSave, onClose }) {
  const [name, setName] = useState("My Theme");
  const baseTheme = BUILT_IN_THEMES[0];
  const [vars, setVars] = useState({ ...baseTheme.vars });

  function save() {
    if (!name.trim()) return;
    const theme = buildCustomTheme(`custom-${generateId()}`, name.trim(), vars);
    onSave(theme);
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <h4
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Theme Builder
        </h4>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-(--bg-overlay)"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={14} />
        </button>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Theme name"
        className="px-3 py-2 text-sm rounded-lg outline-none"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
        {Object.entries(VAR_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="color"
              value={vars[key] || "#000000"}
              onChange={(e) => setVars({ ...vars, [key]: e.target.value })}
              className="w-7 h-7 rounded-md cursor-pointer border-0 shrink-0"
              style={{ background: "none" }}
            />
            <span
              className="text-[10px] truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={save}
        className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ background: "var(--accent)", color: "white" }}
      >
        <Check size={14} />
        Save Theme
      </button>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 py-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <span className="text-white text-2xl font-bold">R</span>
        </div>
        <div className="text-center">
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            RestMan
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Modern REST API & WebSocket Testing Client
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            v1.0.0
          </p>
        </div>
      </div>
      <div
        className="rounded-xl p-4 flex flex-col gap-2"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        {[
          ["Frontend", "React 18, TailwindCSS v4, Zustand, Monaco Editor"],
          ["Backend", "Express.js, MongoDB / SQLite, WebSocket (ws)"],
          ["Features", "HTTP, WebSocket, Collections, Environments, History"],
          ["Themes", "50+ built-in + custom theme builder"],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start gap-3">
            <span
              className="text-xs font-medium w-20 shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              {label}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
