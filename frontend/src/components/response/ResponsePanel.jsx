import { useState } from "react";
import { Copy, Check, Download, ChevronRight } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useUIStore, useThemeStore } from "../../store/index.js";
import { BUILT_IN_THEMES } from "../../themes/index.js";
import {
  getStatusBg,
  formatTime,
  formatBytes,
  prettifyJson,
} from "../../utils/helpers.js";
import ResponseTimingBar from "./ResponseTimingBar.jsx";

export default function ResponsePanel({ tab }) {
  const { responseTab, setResponseTab } = useUIStore();
  const { currentThemeId, customThemes } = useThemeStore();
  const [copied, setCopied] = useState(false);

  const allThemes = [...BUILT_IN_THEMES, ...customThemes];
  const currentTheme = allThemes.find((t) => t.id === currentThemeId);
  const monacoTheme =
    currentTheme?.category === "light" ? "vs-light" : "vs-dark";

  const response = tab?.response;
  const loading = tab?.loading;

  function copy() {
    const content = getBodyString();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const content = getBodyString();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "response.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function getBodyString() {
    if (!response?.body) return "";
    if (typeof response.body === "string") return response.body;
    return JSON.stringify(response.body, null, 2);
  }

  function getBodyForEditor() {
    if (!response?.body && response?.body !== 0) return "";
    if (typeof response.body === "object")
      return JSON.stringify(response.body, null, 2);
    return String(response.body);
  }

  function getEditorLanguage() {
    const ct = response?.contentType || "";
    if (ct.includes("json")) return "json";
    if (ct.includes("xml")) return "xml";
    if (ct.includes("html")) return "html";
    if (ct.includes("javascript")) return "javascript";
    return "plaintext";
  }

  const TABS = ["body", "headers", "cookies", "timeline"];

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Status bar */}
      <div
        className="flex items-center gap-3 px-3 py-2 shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Response
          </span>
        </div>

        {response && !response.error && (
          <>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${getStatusBg(response.status)}`}
            >
              {response.status} {response.statusText}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatTime(response.time)}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatBytes(response.size)}
            </span>
          </>
        )}

        {response?.error && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/15 text-red-400">
            Error
          </span>
        )}

        <div className="flex-1" />

        {response && (
          <div className="flex items-center gap-1">
            <button
              onClick={copy}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors hover:bg-(--bg-overlay)"
              style={{ color: "var(--text-muted)" }}
            >
              {copied ? (
                <Check size={12} className="text-emerald-400" />
              ) : (
                <Copy size={12} />
              )}
              {copied ? "Copied" : "Copy Response"}
            </button>
            <button
              onClick={download}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors hover:bg-(--bg-overlay)"
              style={{ color: "var(--text-muted)" }}
            >
              <Download size={12} />
              Save Response
            </button>
          </div>
        )}

        {/* Response tabs */}
        <div className="flex items-center gap-0.5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setResponseTab(t)}
              className="text-xs px-2.5 py-1 rounded-md capitalize transition-colors"
              style={{
                background:
                  responseTab === t ? "var(--bg-overlay)" : "transparent",
                color:
                  responseTab === t
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor:
                  "var(--accent) transparent var(--accent) var(--accent)",
              }}
            />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sending request...
            </p>
          </div>
        )}

        {!loading && !response && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
              style={{ background: "var(--bg-elevated)" }}
            >
              <ChevronRight size={20} style={{ color: "var(--text-muted)" }} />
            </div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Send a request to see the response
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Hit Send or press Enter
            </p>
          </div>
        )}

        {!loading && response?.error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <div
              className="p-4 rounded-xl text-center max-w-md"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <p className="text-sm font-medium text-red-400 mb-2">
                Request Failed
              </p>
              <p
                className="text-xs font-mono"
                style={{ color: "var(--text-secondary)" }}
              >
                {response.error}
              </p>
            </div>
          </div>
        )}

        {!loading && response && !response.error && (
          <>
            {responseTab === "body" && (
              <Editor
                height="100%"
                language={getEditorLanguage()}
                value={getBodyForEditor()}
                theme={monacoTheme}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 16,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  padding: { top: 8, bottom: 8 },
                  scrollbar: { verticalScrollbarSize: 4 },
                }}
              />
            )}

            {responseTab === "headers" && (
              <div className="p-3 overflow-auto h-full">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th
                        className="text-left pb-2 font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Header
                      </th>
                      <th
                        className="text-left pb-2 font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(response.headers || {}).map(([k, v]) => (
                      <tr
                        key={k}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <td
                          className="py-2 pr-4 font-mono"
                          style={{ color: "var(--accent)" }}
                        >
                          {k}
                        </td>
                        <td
                          className="py-2 font-mono break-all"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {v}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {responseTab === "cookies" && (
              <div className="p-3 overflow-auto h-full">
                {response.headers?.["set-cookie"] ? (
                  <div
                    className="font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {response.headers["set-cookie"]}
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center h-full text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    No cookies in response
                  </div>
                )}
              </div>
            )}

            {responseTab === "timeline" && (
              <div className="p-4 overflow-auto h-full flex flex-col gap-3">
                <div
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h3
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Request Timeline
                  </h3>
                  {[
                    {
                      label: "Total Time",
                      value: formatTime(response.time),
                      color: "var(--accent)",
                    },
                    {
                      label: "Status",
                      value: `${response.status} ${response.statusText}`,
                      color:
                        response.status < 400
                          ? "var(--success)"
                          : "var(--error)",
                    },
                    {
                      label: "Response Size",
                      value: formatBytes(response.size),
                      color: "var(--text-secondary)",
                    },
                    {
                      label: "Content-Type",
                      value: response.contentType || "unknown",
                      color: "var(--text-secondary)",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between"
                    >
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {label}
                      </span>
                      <span
                        className="text-xs font-mono font-medium"
                        style={{ color }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* Response timing sparkline — show last N times for this tab */}
      <ResponseTimingBar timings={tab?.responseTimes} />
    </div>
  );
}
