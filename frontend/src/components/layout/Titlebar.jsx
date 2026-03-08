// src/components/layout/Titlebar.jsx
import { useState, useRef, useEffect } from "react";
import {
  PanelLeft,
  Plus,
  Settings,
  Zap,
  Globe,
  Wifi,
  ChevronDown,
  Search,
  Terminal,
} from "lucide-react";
import { useUIStore, useTabStore } from "../../store/index.js";
import EnvSelector from "../environment/EnvSelector.jsx";
import SettingsModal from "../settings/SettingsModal.jsx";
import Portal from "../ui/Portal.jsx";
import CommandPalette from "../ui/CommandPalette.jsx";
import CurlImportModal from "../ui/CurlImportModal.jsx";
import { useDropdownPosition } from "../../hooks/useDropdownPosition.js";

export default function Titlebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { addTab } = useTabStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const menuRef = useRef(null);
  const { pos, measure } = useDropdownPosition();

  // Cmd+K / Ctrl+K opens command palette
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
      if (e.key === "Escape") setShowPalette(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function newHttp() {
    addTab({ type: "http", method: "GET", name: "New Request" });
    setShowNewMenu(false);
  }
  function newWS() {
    addTab({ type: "websocket", name: "New WebSocket", method: "WS" });
    setShowNewMenu(false);
  }

  return (
    <>
      <div
        className="flex items-center h-11 px-3 gap-2 shrink-0 select-none"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <Zap size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            RestMan
          </span>
        </div>

        {/* Sidebar toggle (Ctrl+B) */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-1.5 rounded-md transition-colors cursor-pointer"
          style={{ color: "var(--text-muted)" }}
          title="Toggle Sidebar (Ctrl+B)"
        >
          <PanelLeft size={16} />
        </button>

        {/* New tab dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => {
              measure(menuRef.current);
              setShowNewMenu(!showNewMenu);
            }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md transition-colors text-xs font-medium"
            style={{
              color: "var(--text-muted)",
              background: showNewMenu ? "var(--bg-overlay)" : "transparent",
            }}
            title="New Request"
          >
            <Plus size={14} />
            <ChevronDown size={11} />
          </button>

          {showNewMenu && (
            <Portal>
              <div
                className="fixed inset-0"
                style={{ zIndex: 9998 }}
                onMouseDown={() => setShowNewMenu(false)}
              />
              <div
                className="fixed rounded-xl overflow-hidden shadow-2xl w-52"
                style={{
                  top: pos.top,
                  left: pos.left,
                  zIndex: 9999,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    newHttp();
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 transition-colors text-left"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-overlay)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "var(--accent-subtle)" }}
                  >
                    <Globe size={14} style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">HTTP Request</p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      REST API
                    </p>
                  </div>
                </button>
                <div
                  style={{
                    height: 1,
                    background: "var(--border-subtle)",
                    margin: "0 12px",
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    newWS();
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 transition-colors text-left"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-overlay)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(16,185,129,0.12)" }}
                  >
                    <Wifi size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">WebSocket</p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Real-time connections
                    </p>
                  </div>
                </button>
                <div
                  style={{
                    height: 1,
                    background: "var(--border-subtle)",
                    margin: "0 12px",
                  }}
                />
                {/* cURL import */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCurlImport(true);
                    setShowNewMenu(false);
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 transition-colors text-left"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-overlay)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(245,158,11,0.12)" }}
                  >
                    <Terminal size={14} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Import cURL</p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Paste a cURL command
                    </p>
                  </div>
                </button>
              </div>
            </Portal>
          )}
        </div>

        <button
          onClick={() => setShowCurlImport(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-overlay)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
          title="Import cURL"
        >
          <Terminal size={13} />
          <span className="hidden sm:inline">Import cURL</span>
        </button>

        {/* Command Palette trigger */}
        <button
          onClick={() => setShowPalette(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors min-w-40 justify-between"
          style={{
            color: "var(--text-muted)",
            background: "var(--bg-overlay)",
            border: "1px solid var(--border)",
          }}
          title="Command Palette (Ctrl+K)"
        >
          <div className="flex items-center justify-center gap-2">
            <Search size={12} />
            <span className="hidden sm:inline">Search...</span>
          </div>
          <kbd
            className="hidden sm:inline text-[10px] px-1 rounded"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-muted)",
            }}
          >
            Ctrl+K
          </kbd>
        </button>

        <div className="flex-1" />
        <EnvSelector />

        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "var(--text-muted)" }}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
      {showCurlImport && (
        <CurlImportModal onClose={() => setShowCurlImport(false)} />
      )}
    </>
  );
}
