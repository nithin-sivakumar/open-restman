import { useEffect, useState, useRef } from "react";
import { X, Plus, Wifi, Globe, ChevronDown } from "lucide-react";
import { useTabStore } from "../../store/index.js";
import RequestPanel from "../request/RequestPanel.jsx";
import WSPanel from "../websocket/WSPanel.jsx";
import Portal from "../ui/Portal.jsx";
import { useDropdownPosition } from "../../hooks/useDropdownPosition.js";

function MenuOption({ label, onClick }) {
  return (
    <button
      className="w-full px-3 py-1.5 text-left text-xs hover:bg-(--bg-overlay) cursor-pointer"
      style={{ color: "var(--accent)" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {label}
    </button>
  );
}

export default function MainArea() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, init } =
    useTabStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const { pos, measure } = useDropdownPosition();

  const { duplicateTab, closeOthers, closeAll, renameTab } = useTabStore();
  const [contextMenu, setContextMenu] = useState(null); // { x, y, tabId }

  const handleContextMenu = (e, tabId) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  useEffect(() => {
    init();
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  function newHttp() {
    addTab({ type: "http", method: "GET", name: "New Request" });
    setShowMenu(false);
  }

  function newWS() {
    addTab({ type: "websocket", name: "New WebSocket", method: "WS" });
    setShowMenu(false);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div
        className="flex items-center min-h-10 w-full"
        style={{
          background: "var(--bg-base)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex-1 min-w-0 flex items-stretch overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              active={tab.id === activeTabId}
              onActivate={() => setActiveTab(tab.id)}
              onClose={() => closeTab(tab.id)}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>

        {/* New tab dropdown */}
        <div
          ref={menuRef}
          className="shrink-0 px-2 flex items-center border-l"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => {
              measure(menuRef.current);
              setShowMenu(!showMenu);
            }}
            className="flex items-center gap-0.5 p-1.5 rounded-md transition-colors"
            style={{
              color: "var(--text-muted)",
              background: showMenu ? "var(--bg-overlay)" : "transparent",
            }}
            title="New Tab"
          >
            <Plus size={14} />
            <ChevronDown size={10} />
          </button>

          {showMenu && (
            <Portal>
              <div
                className="fixed inset-0"
                style={{ zIndex: 9998 }}
                onMouseDown={() => setShowMenu(false)}
              />
              <div
                className="fixed rounded-xl overflow-hidden shadow-2xl w-48"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-overlay)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Globe size={13} style={{ color: "var(--accent)" }} />
                  <div>
                    <p className="font-medium">HTTP Request</p>
                    <p
                      className="text-[10px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      REST, GraphQL
                    </p>
                  </div>
                </button>

                <div
                  style={{
                    height: "1px",
                    background: "var(--border-subtle)",
                    margin: "0 10px",
                  }}
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    newWS();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-overlay)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <Wifi size={13} className="text-emerald-400" />
                  <div>
                    <p className="font-medium">WebSocket</p>
                    <p
                      className="text-[10px]"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Real-time
                    </p>
                  </div>
                </button>
              </div>
            </Portal>
          )}
        </div>
      </div>

      {/* Context Menu Portal */}
      {contextMenu && (
        <Portal>
          <div
            className="fixed inset-0 z-10000"
            onMouseDown={() => setContextMenu(null)}
          />
          <div
            className="fixed w-40 py-1 rounded-lg shadow-xl border z-10001"
            style={{
              top: contextMenu.y,
              left: contextMenu.x,
              background: "var(--bg-elevated)",
              borderColor: "var(--border)",
            }}
          >
            <MenuOption
              label="Duplicate"
              onClick={() => {
                duplicateTab(contextMenu.tabId);
                setContextMenu(null);
              }}
            />
            <div className="h-px my-1 bg-(--border-subtle)" />
            <MenuOption
              label="Close"
              onClick={() => {
                closeTab(contextMenu.tabId);
                setContextMenu(null);
              }}
            />
            <MenuOption
              label="Close Others"
              onClick={() => {
                closeOthers(contextMenu.tabId);
                setContextMenu(null);
              }}
            />
            <MenuOption label="Close All" onClick={() => closeAll()} />
          </div>
        </Portal>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab?.type === "websocket" ? (
          <WSPanel tab={activeTab} />
        ) : (
          <RequestPanel tab={activeTab} />
        )}
      </div>
    </div>
  );
}

function TabItem({ tab, active, onActivate, onClose, onContextMenu }) {
  const [isEditing, setIsEditing] = useState(false);
  const { renameTab } = useTabStore();

  const handleAuxClick = (e) => {
    // button 1 is the middle click / scroll wheel
    if (e.button === 1) {
      e.preventDefault(); // Prevent default browser behavior (like autoscroll)
      onClose();
    }
  };

  return (
    <div
      onClick={onActivate}
      onAuxClick={handleAuxClick}
      onContextMenu={(e) => onContextMenu(e, tab.id)}
      className="group flex items-center gap-1.5 px-3 py-2 cursor-pointer min-w-0 max-w-45 shrink-0 relative"
      style={{
        background: active ? "var(--bg-elevated)" : "transparent",
        borderRight: "1px solid var(--border)",
        borderBottom: active
          ? "2px solid var(--accent)"
          : "2px solid transparent",
      }}
    >
      {tab.type === "websocket" ? (
        <Wifi size={11} className="shrink-0 text-emerald-400" />
      ) : (
        <span
          className={`text-[10px] font-bold shrink-0 ${
            tab.method
              ? tab.method === "GET"
                ? "text-emerald-400"
                : tab.method === "POST"
                  ? "text-blue-400"
                  : tab.method === "PUT"
                    ? "text-amber-400"
                    : tab.method === "DELETE"
                      ? "text-red-400"
                      : tab.method === "PATCH"
                        ? "text-purple-400"
                        : "text-(--text-muted)"
              : "text-(--text-muted)"
          }`}
        >
          {tab.method || "GET"}
        </span>
      )}
      {/* <span
        onDoubleClick={() => setIsEditing(true)}
        className="text-xs truncate flex-1 min-w-0"
        style={{
          color: active ? "var(--text-primary)" : "var(--text-secondary)",
        }}
      >
        {tab.name || "New Request"}
      </span> */}
      {isEditing ? (
        <input
          autoFocus
          spellCheck="false"
          className="w-full h-7 text-xs bg-(--bg-input) px-2 rounded border border-(--accent) outline-none"
          value={tab.name}
          onChange={(e) => renameTab(tab.id, e.target.value)}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
          onFocus={(e) => e.target.select()} // Auto-select text for convenience
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          onDoubleClick={() => setIsEditing(true)}
          className="text-xs truncate select-none py-1"
        >
          {tab.name || "New Request"}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-(--bg-overlay) transition-all"
        style={{ color: "var(--text-muted)" }}
      >
        <X size={11} />
      </button>
    </div>
  );
}
