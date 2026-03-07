// src/components/request/RequestPanel.jsx
import { useState, useRef } from "react";
import { Send, Save, Copy, ChevronDown, Wifi } from "lucide-react";
import {
  useTabStore,
  useEnvStore,
  useHistoryStore,
  useUIStore,
} from "../../store/index.js";
import { sendProxyRequest } from "../../utils/api.js";
import { historyApi } from "../../utils/api.js";
import {
  buildUrlWithParams,
  getStatusBg,
  formatTime,
  formatBytes,
} from "../../utils/helpers.js";
import MethodSelector from "./MethodSelector.jsx";
import RequestTabs from "./RequestTabs.jsx";
import ResponsePanel from "../response/ResponsePanel.jsx";
import URLInput from "./URLInput.jsx";

export default function RequestPanel({ tab }) {
  const { updateTab } = useTabStore();
  const { resolveVariables } = useEnvStore();
  const { addEntry } = useHistoryStore();
  const [splitPos, setSplitPos] = useState(45);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const startPos = useRef(0);

  if (!tab) return null;

  async function sendRequest() {
    if (!tab.url) return;
    updateTab(tab.id, { loading: true, response: null });

    const resolvedUrl = resolveVariables(
      buildUrlWithParams(tab.url, tab.params || []),
    );
    console.log(resolvedUrl);
    const resolvedHeaders = (tab.headers || []).map((h) => ({
      ...h,
      value: resolveVariables(h.value),
    }));

    // Add auth headers
    if (tab.auth?.type === "bearer" && tab.auth.token) {
      resolvedHeaders.push({
        key: "Authorization",
        value: `Bearer ${resolveVariables(tab.auth.token)}`,
        enabled: true,
      });
    } else if (tab.auth?.type === "basic" && tab.auth.username) {
      const encoded = btoa(`${tab.auth.username}:${tab.auth.password || ""}`);
      resolvedHeaders.push({
        key: "Authorization",
        value: `Basic ${encoded}`,
        enabled: true,
      });
    } else if (tab.auth?.type === "apikey" && tab.auth.key) {
      const headerName =
        tab.auth.in === "header" ? tab.auth.keyName || "X-API-Key" : null;
      if (headerName)
        resolvedHeaders.push({
          key: headerName,
          value: resolveVariables(tab.auth.key),
          enabled: true,
        });
    }

    try {
      const result = await sendProxyRequest({
        url: resolvedUrl,
        method: tab.method,
        headers: resolvedHeaders,
        body: resolveVariables(tab.body),
        bodyType: tab.bodyType,
        formFields: tab.formFields,
        auth: tab.auth,
        params: tab.params,
      });

      updateTab(tab.id, { loading: false, response: result });

      // Save to history
      const entry = {
        method: tab.method,
        url: resolvedUrl,
        status: result.status,
        statusText: result.statusText,
        time: result.time,
        size: result.size,
        request: {
          url: resolvedUrl,
          method: tab.method,
          headers: resolvedHeaders,
          body: resolveVariables(tab.body),
          bodyType: tab.bodyType,
          formFields: tab.formFields,
          auth: tab.auth,
          params: tab.params,
          name: tab.name,
          customName: tab.customName,
        },
        response: result,
      };
      historyApi
        .add(entry)
        .then(addEntry)
        .catch(() => {});
    } catch (err) {
      updateTab(tab.id, {
        loading: false,
        response: { error: err.message, status: 0, statusText: "Error" },
      });
    }
  }

  function onSplitMouseDown(e) {
    e.preventDefault();
    setDragging(true);
    startY.current = e.clientY;
    startPos.current = splitPos;

    function onMove(e) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setSplitPos(Math.min(80, Math.max(20, pct)));
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div ref={containerRef} className="flex flex-col h-full min-h-0">
      {/* URL bar */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <MethodSelector
          method={tab.method}
          onChange={(m) => updateTab(tab.id, { method: m })}
        />
        <div
          className="flex-1 flex items-center rounded-lg overflow-hidden"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
          }}
        >
          <URLInput
            value={tab.url}
            placeholder="Enter URL or paste text (use {{variable}} for env vars)"
            onChange={(e) =>
              updateTab(tab.id, {
                url: e.target.value,
                name: e.target.value || "New Request",
              })
            }
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
          />
        </div>
        <button
          onClick={sendRequest}
          disabled={tab.loading || !tab.url}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: tab.loading ? "var(--bg-overlay)" : "var(--accent)",
            color: "white",
          }}
        >
          {tab.loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Send size={14} />
          )}
          <span>{tab.loading ? "Sending..." : "Send"}</span>
        </button>
      </div>

      {/* Split pane */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Request config */}
        <div
          style={{ height: `${splitPos}%`, minHeight: 0, overflow: "hidden" }}
        >
          <RequestTabs tab={tab} />
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={onSplitMouseDown}
          className="shrink-0 cursor-row-resize flex items-center justify-center h-1.5 hover:bg-(--accent)/30 transition-colors group"
          style={{
            background: dragging ? "var(--accent)" : "var(--border-subtle)",
          }}
        >
          <div
            className="w-8 h-0.5 rounded-full transition-colors"
            style={{ background: dragging ? "var(--accent)" : "var(--border)" }}
          />
        </div>

        {/* Response */}
        <div
          style={{
            height: `${100 - splitPos}%`,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <ResponsePanel tab={tab} />
        </div>
      </div>
    </div>
  );
}
