// src/components/request/RequestPanel.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Save, Copy } from "lucide-react";
import {
  useTabStore,
  useEnvStore,
  useHistoryStore,
} from "../../store/index.js";
import {
  sendProxyRequest,
  historyApi,
  collectionsApi,
} from "../../utils/api.js";
import { buildUrlWithParams, tabToCurl } from "../../utils/helpers.js";
import MethodSelector from "./MethodSelector.jsx";
import RequestTabs from "./RequestTabs.jsx";
import ResponsePanel from "../response/ResponsePanel.jsx";
import URLInput from "./URLInput.jsx";
import SaveRequestModal from "../collections/SaveRequestModal.jsx";

export default function RequestPanel({ tab }) {
  const { updateTab, markTabSaved, renameTab } = useTabStore();
  const { resolveVariables } = useEnvStore();
  const { addEntry } = useHistoryStore();
  const [splitPos, setSplitPos] = useState(45);
  const [dragging, setDragging] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);

  function copyCurl() {
    const curl = tabToCurl(tab);
    navigator.clipboard.writeText(curl);
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  }
  const containerRef = useRef(null);

  // Bug fix #3: smart save — bypass modal if already saved to a collection
  const handleSave = useCallback(async () => {
    if (!tab) return;
    if (tab.collectionId && tab.requestId) {
      // Already saved — update in place without showing modal
      setQuickSaving(true);
      try {
        const requestData =
          tab.type === "websocket"
            ? {
                id: tab.requestId,
                name: tab.name,
                type: "websocket",
                url: tab.url || "",
                messages: tab.wsMessages || "",
              }
            : {
                id: tab.requestId,
                name: tab.name,
                method: tab.method,
                url: tab.url || "",
                headers: tab.headers || [],
                params: tab.params || [],
                bodyType: tab.bodyType || "none",
                body: tab.body || "",
                formFields: tab.formFields || [],
                auth: tab.auth || { type: "none" },
                type: tab.type || "http",
              };
        await collectionsApi.updateRequest(tab.collectionId, tab.requestId, {
          ...requestData,
          folderId: tab.folderId,
        });
        markTabSaved(tab.id, {
          collectionId: tab.collectionId,
          requestId: tab.requestId,
          folderId: tab.folderId,
        });
      } catch (err) {
        console.error("Quick save failed:", err);
      } finally {
        setQuickSaving(false);
      }
    } else {
      setShowSaveModal(true);
    }
  }, [tab, markTabSaved]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  if (!tab) return null;

  async function sendRequest() {
    if (!tab.url) return;
    updateTab(tab.id, { loading: true, response: null });
    const resolvedUrl = resolveVariables(
      buildUrlWithParams(tab.url, tab.params || []),
    );
    const resolvedHeaders = (tab.headers || []).map((h) => ({
      ...h,
      value: resolveVariables(h.value),
    }));

    if (tab.auth?.type === "bearer" && tab.auth.token) {
      resolvedHeaders.push({
        key: "Authorization",
        value: `Bearer ${resolveVariables(tab.auth.token)}`,
        enabled: true,
      });
    } else if (tab.auth?.type === "basic" && tab.auth.username) {
      resolvedHeaders.push({
        key: "Authorization",
        value: `Basic ${btoa(`${tab.auth.username}:${tab.auth.password || ""}`)}`,
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
      const newTimes = [...(tab.responseTimes || []), result.time].slice(-20); // keep last 20
      updateTab(tab.id, {
        loading: false,
        response: result,
        responseTimes: newTimes,
        isDirty: tab.isDirty,
      });
      historyApi
        .add({
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
        })
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
    function onMove(e) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSplitPos(
        Math.min(
          80,
          Math.max(20, ((e.clientY - rect.top) / rect.height) * 100),
        ),
      );
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

        {/* Copy as cURL */}
        <button
          onClick={copyCurl}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm transition-all"
          style={{
            color: curlCopied ? "var(--accent)" : "var(--text-muted)",
            background: "var(--bg-overlay)",
          }}
          title="Copy as cURL"
        >
          <Copy size={13} />
          <span className="text-xs hidden sm:inline">
            {curlCopied ? "Copied!" : "cURL"}
          </span>
        </button>

        {/* Save button — shows modal only for new/unsaved requests */}
        <button
          onClick={handleSave}
          disabled={quickSaving}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all relative"
          style={{
            background: tab.isDirty
              ? "var(--accent-subtle)"
              : "var(--bg-overlay)",
            color: tab.isDirty ? "var(--accent)" : "var(--text-muted)",
            border: tab.isDirty
              ? "1px solid var(--accent)"
              : "1px solid transparent",
          }}
          title={tab.collectionId ? "Save (Ctrl+S)" : "Save Request (Ctrl+S)"}
        >
          {quickSaving ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {tab.isDirty && (
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ background: "var(--accent)" }}
            />
          )}
        </button>

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
          <span>{tab.loading ? "Sending…" : "Send"}</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div
          style={{ height: `${splitPos}%`, minHeight: 0, overflow: "hidden" }}
        >
          <RequestTabs tab={tab} />
        </div>
        <div
          onMouseDown={onSplitMouseDown}
          className="shrink-0 cursor-row-resize flex items-center justify-center h-1.5 transition-colors"
          style={{
            background: dragging ? "var(--accent)" : "var(--border-subtle)",
          }}
        >
          <div
            className="w-8 h-0.5 rounded-full"
            style={{ background: dragging ? "var(--accent)" : "var(--border)" }}
          />
        </div>
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

      {showSaveModal && (
        <SaveRequestModal tab={tab} onClose={() => setShowSaveModal(false)} />
      )}
    </div>
  );
}
