import { useUIStore, useTabStore } from "../../store/index.js";
import ParamsTab from "./tabs/ParamsTab.jsx";
import HeadersTab from "./tabs/HeadersTab.jsx";
import BodyTab from "./tabs/BodyTab.jsx";
import AuthTab from "./tabs/AuthTab.jsx";

const TABS = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "auth", label: "Auth" },
];

export default function RequestTabs({ tab }) {
  const { requestTab, setRequestTab } = useUIStore();

  function getBadge(id) {
    if (!tab) return null;
    if (id === "params") {
      const count = (tab.params || []).filter((p) => p.enabled && p.key).length;
      return count > 0 ? count : null;
    }
    if (id === "headers") {
      const count = (tab.headers || []).filter(
        (h) => h.enabled && h.key,
      ).length;
      return count > 0 ? count : null;
    }
    if (id === "body") {
      return tab.bodyType && tab.bodyType !== "none" ? "•" : null;
    }
    if (id === "auth") {
      return tab.auth?.type && tab.auth.type !== "none" ? "•" : null;
    }
    return null;
  }

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Tab header */}
      <div
        className="flex items-center px-3 gap-0.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {TABS.map(({ id, label }) => {
          const badge = getBadge(id);
          return (
            <button
              key={id}
              onClick={() => setRequestTab(id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors relative"
              style={{
                color:
                  requestTab === id ? "var(--accent)" : "var(--text-muted)",
                borderBottom:
                  requestTab === id
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
              }}
            >
              {label}
              {badge !== null && (
                <span
                  className="text-[9px] px-1 rounded-full min-w-3.5 text-center leading-none py-0.5"
                  style={{
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto min-h-0">
        {requestTab === "params" && <ParamsTab tab={tab} />}
        {requestTab === "headers" && <HeadersTab tab={tab} />}
        {requestTab === "body" && <BodyTab tab={tab} />}
        {requestTab === "auth" && <AuthTab tab={tab} />}
      </div>
    </div>
  );
}
