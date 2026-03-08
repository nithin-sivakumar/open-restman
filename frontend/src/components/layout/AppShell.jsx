// src/components/layout/AppShell.jsx
import { useEffect, useRef, useState } from "react";
import Titlebar from "./Titlebar.jsx";
import Sidebar from "./Sidebar.jsx";
import MainArea from "./MainArea.jsx";
import { useUIStore } from "../../store/index.js";

export default function AppShell() {
  const {
    sidebarWidth,
    sidebarCollapsed,
    setSidebarWidth,
    setSidebarCollapsed,
  } = useUIStore();
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);

  // Bug fix #1: Ctrl+B toggles sidebar globally
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  function onMouseDown(e) {
    e.preventDefault();
    setDragging(true);
    startX.current = e.clientX;
    startW.current = sidebarWidth;
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e) {
      const delta = e.clientX - startX.current;
      const newW = Math.min(420, Math.max(180, startW.current + delta));
      setSidebarWidth(newW);
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  return (
    <div className="flex flex-col h-full">
      <Titlebar />
      <div className="flex flex-1 min-h-0">
        {!sidebarCollapsed && (
          <>
            <div
              className="shrink-0 flex flex-col min-h-0 overflow-hidden"
              style={{ width: sidebarWidth }}
            >
              <Sidebar />
            </div>
            {/* Resize handle */}
            <div
              onMouseDown={onMouseDown}
              className="w-0.75 shrink-0 cursor-col-resize transition-colors duration-150"
              style={{
                background: dragging ? "var(--accent)" : "var(--border)",
              }}
            />
          </>
        )}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <MainArea />
        </div>
      </div>
    </div>
  );
}
