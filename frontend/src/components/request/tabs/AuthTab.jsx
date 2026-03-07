import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTabStore } from "../../../store/index.js";

const AUTH_TYPES = [
  { id: "none", label: "No Auth" },
  { id: "bearer", label: "Bearer Token" },
  { id: "basic", label: "Basic Auth" },
  { id: "apikey", label: "API Key" },
  // { id: "oauth2", label: "OAuth 2.0" },
  // { id: "digest", label: "Digest Auth" },
];

function Field({ label, value, onChange, type = "text", placeholder }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-xs font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={isPass && !show ? "password" : "text"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="w-full px-3 py-2 text-xs rounded-lg outline-none pr-8"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {isPass && (
          <button
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          >
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AuthTab({ tab }) {
  const { updateTab } = useTabStore();
  const auth = tab?.auth || { type: "none" };

  function setAuth(updates) {
    updateTab(tab.id, { auth: { ...auth, ...updates } });
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Auth type selector */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Auth Type
        </label>
        <select
          value={auth.type || "none"}
          onChange={(e) => setAuth({ type: e.target.value })}
          className="px-3 py-2 text-xs rounded-lg outline-none"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          {AUTH_TYPES.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* No auth */}
      {auth.type === "none" && (
        <p
          className="text-xs py-4 text-center"
          style={{ color: "var(--text-muted)" }}
        >
          No authentication will be applied.
        </p>
      )}

      {/* Bearer Token */}
      {auth.type === "bearer" && (
        <div className="flex flex-col gap-3">
          <Field
            label="Token"
            value={auth.token}
            onChange={(v) => setAuth({ token: v })}
            type="password"
            placeholder="Enter bearer token"
          />
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Will be sent as:{" "}
            <code className="font-mono">Authorization: Bearer {"<token>"}</code>
          </p>
        </div>
      )}

      {/* Basic Auth */}
      {auth.type === "basic" && (
        <div className="flex flex-col gap-3">
          <Field
            label="Username"
            value={auth.username}
            onChange={(v) => setAuth({ username: v })}
          />
          <Field
            label="Password"
            value={auth.password}
            onChange={(v) => setAuth({ password: v })}
            type="password"
          />
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Credentials will be Base64 encoded and sent as Authorization header.
          </p>
        </div>
      )}

      {/* API Key */}
      {auth.type === "apikey" && (
        <div className="flex flex-col gap-3">
          <Field
            label="Key Name"
            value={auth.keyName}
            onChange={(v) => setAuth({ keyName: v })}
            placeholder="X-API-Key"
          />
          <Field
            label="Key Value"
            value={auth.key}
            onChange={(v) => setAuth({ key: v })}
            type="password"
          />
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Add to
            </label>
            <select
              value={auth.in || "header"}
              onChange={(e) => setAuth({ in: e.target.value })}
              className="px-3 py-2 text-xs rounded-lg outline-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="header">Header</option>
              <option value="query">Query Parameter</option>
            </select>
          </div>
        </div>
      )}

      {/* OAuth 2.0 */}
      {auth.type === "oauth2" && (
        <div className="flex flex-col gap-3">
          <Field
            label="Access Token"
            value={auth.token}
            onChange={(v) => setAuth({ token: v })}
            type="password"
            placeholder="Paste access token"
          />
          <div
            className="p-3 rounded-lg text-xs"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            Paste your OAuth 2.0 access token above. Token will be sent as
            Bearer token.
          </div>
        </div>
      )}

      {/* Digest Auth */}
      {auth.type === "digest" && (
        <div className="flex flex-col gap-3">
          <Field
            label="Username"
            value={auth.username}
            onChange={(v) => setAuth({ username: v })}
          />
          <Field
            label="Password"
            value={auth.password}
            onChange={(v) => setAuth({ password: v })}
            type="password"
          />
        </div>
      )}
    </div>
  );
}
