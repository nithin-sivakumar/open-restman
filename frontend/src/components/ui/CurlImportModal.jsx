// src/components/ui/CurlImportModal.jsx
import { useState } from "react";
import { Terminal, X, ArrowRight } from "lucide-react";
import Portal from "./Portal.jsx";
import { useTabStore } from "../../store/index.js";
import { generateId } from "../../utils/helpers.js";

function parseCurl(raw) {
  const text = raw.replace(/\\\s*\n/g, " ").trim();
  const result = {
    method: "GET",
    url: "",
    headers: [],
    body: "",
    bodyType: "none",
  };

  // URL — first unquoted non-flag token after "curl"
  const urlMatch = text.match(
    /curl\s+(?:[^'"]*?\s+)?['"]?(https?:\/\/[^\s'"]+)['"]?/,
  );
  if (urlMatch) result.url = urlMatch[1];

  // Method
  const mMatch = text.match(/-X\s+['"]?(\w+)['"]?/);
  if (mMatch) result.method = mMatch[1].toUpperCase();

  // Headers
  const hReg = /-H\s+['"]([^'"]+)['"]/g;
  let hm;
  while ((hm = hReg.exec(text)) !== null) {
    const [k, ...vs] = hm[1].split(":");
    result.headers.push({
      id: generateId(),
      key: k.trim(),
      value: vs.join(":").trim(),
      enabled: true,
    });
  }

  // Body
  const bMatch = text.match(
    /(?:--data(?:-raw)?|--data-urlencode|-d)\s+(['"])([\s\S]*?)\1/,
  );
  if (bMatch) {
    result.body = bMatch[2];
    result.bodyType = "raw";

    if (!mMatch) result.method = "POST";

    try {
      JSON.parse(result.body);
      result.bodyType = "json";
    } catch {}
  }

  if (!result.headers.length)
    result.headers = [{ id: generateId(), key: "", value: "", enabled: true }];
  return result;
}

export default function CurlImportModal({ onClose }) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const { addTab } = useTabStore();

  function handleImport() {
    if (!raw.trim()) return;
    try {
      const parsed = parseCurl(raw);
      if (!parsed.url) {
        setError("Could not parse a valid URL from the cURL command.");
        return;
      }
      addTab({
        ...parsed,
        name: parsed.url,
        params: [{ id: generateId(), key: "", value: "", enabled: true }],
        formFields: [
          { id: generateId(), key: "", value: "", type: "text", enabled: true },
        ],
        auth: { type: "none" },
        type: "http",
      });
      onClose();
    } catch (e) {
      setError("Failed to parse cURL command.");
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 20001,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--accent-subtle)" }}
              >
                <Terminal size={15} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Import from cURL
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  Paste any cURL command to create a request tab
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-overlay)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <X size={15} />
            </button>
          </div>
          <div className="p-5">
            <textarea
              autoFocus
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                  handleImport();
              }}
              placeholder={
                'curl -X POST https://api.example.com/data \\\n  -H "Content-Type: application/json" \\\n  -d \'{"key":"value"}\''
              }
              rows={7}
              className="w-full text-xs font-mono px-3 py-2.5 rounded-xl outline-none resize-none"
              style={{
                background: "var(--bg-input)",
                border: `1px solid ${error ? "var(--error)" : "var(--border)"}`,
                color: "var(--text-primary)",
              }}
            />
            {error && (
              <p className="text-xs mt-1" style={{ color: "var(--error)" }}>
                {error}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 px-5 pb-5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm"
              style={{
                color: "var(--text-muted)",
                background: "var(--bg-overlay)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!raw.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Import <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
