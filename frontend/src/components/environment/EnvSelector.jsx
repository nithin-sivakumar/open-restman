import { useState, useRef, useEffect } from "react";
import { ChevronDown, Globe, Check } from "lucide-react";
import { useEnvStore } from "../../store/index.js";

export default function EnvSelector() {
  const { environments, activeEnvId, setActiveEnv } = useEnvStore();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const activeEnv = environments.find((e) => e._id === activeEnvId);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          color: activeEnv ? "var(--text-primary)" : "var(--text-muted)",
        }}
      >
        <Globe
          size={12}
          style={{ color: activeEnv ? "var(--accent)" : "var(--text-muted)" }}
        />
        <span className="max-w-30 truncate">
          {activeEnv?.name || "No Environment"}
        </span>
        <ChevronDown size={11} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl min-w-45"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => {
              setActiveEnv(null);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-(--bg-overlay)"
            style={{
              color:
                activeEnvId === null
                  ? "var(--accent)"
                  : "var(--text-secondary)",
            }}
          >
            {activeEnvId === null && <Check size={11} />}
            <span className={activeEnvId === null ? "" : "ml-3.75"}>
              No Environment
            </span>
          </button>

          {environments.map((env) => (
            <button
              key={env._id}
              onClick={() => {
                setActiveEnv(env._id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-(--bg-overlay)"
              style={{
                color:
                  activeEnvId === env._id
                    ? "var(--accent)"
                    : "var(--text-secondary)",
              }}
            >
              {activeEnvId === env._id ? (
                <Check size={11} />
              ) : (
                <div className="w-2.75" />
              )}
              {env.name}
              <span
                className="ml-auto text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                {(env.variables || []).length} vars
              </span>
            </button>
          ))}

          {environments.length === 0 && (
            <div
              className="px-3 py-2 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              No environments yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
