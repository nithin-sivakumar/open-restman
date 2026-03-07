import { useState, useEffect, useRef } from "react";
import { Send, Wifi, WifiOff, Trash2, ArrowDown, ArrowUp } from "lucide-react";
import { useTabStore } from "../../store/index.js";

export default function WSPanel({ tab }) {
  const { updateTab } = useTabStore();
  const [status, setStatus] = useState("disconnected"); // disconnected | connecting | connected
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const url = tab?.url || "";

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function connect() {
    if (!url) return;
    setStatus("connecting");
    setMessages((m) => [
      ...m,
      { type: "info", text: `Connecting to ${url}...`, ts: Date.now() },
    ]);

    try {
      const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws-proxy?target=${encodeURIComponent(url)}&id=${tab.id}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Wait for server to confirm connection
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "connected") {
            setStatus("connected");
            setMessages((m) => [
              ...m,
              { type: "info", text: "Connected ✓", ts: Date.now() },
            ]);
          } else if (msg.type === "connecting") {
            setMessages((m) => [
              ...m,
              {
                type: "info",
                text: msg.message || "Connecting...",
                ts: Date.now(),
              },
            ]);
          } else if (msg.type === "message") {
            setMessages((m) => [
              ...m,
              {
                type: msg.direction === "outgoing" ? "outgoing" : "incoming",
                text: msg.data,
                ts: msg.timestamp || Date.now(),
              },
            ]);
          } else if (msg.type === "disconnected") {
            setStatus("disconnected");
            setMessages((m) => [
              ...m,
              {
                type: "info",
                text: `Disconnected (code: ${msg.code})`,
                ts: Date.now(),
              },
            ]);
          } else if (msg.type === "error") {
            setStatus("disconnected");
            setMessages((m) => [
              ...m,
              { type: "error", text: msg.message, ts: Date.now() },
            ]);
          }
        } catch {
          setMessages((m) => [
            ...m,
            { type: "incoming", text: e.data, ts: Date.now() },
          ]);
        }
      };

      ws.onerror = () => {
        setStatus("disconnected");
        setMessages((m) => [
          ...m,
          { type: "error", text: "WebSocket error occurred", ts: Date.now() },
        ]);
      };

      ws.onclose = () => {
        setStatus("disconnected");
      };
    } catch (err) {
      setStatus("disconnected");
      setMessages((m) => [
        ...m,
        { type: "error", text: err.message, ts: Date.now() },
      ]);
    }
  }

  function disconnect() {
    wsRef.current?.close();
    setStatus("disconnected");
  }

  function sendMessage() {
    if (!input.trim() || status !== "connected") return;
    wsRef.current?.send(JSON.stringify({ type: "send", data: input }));
    setInput("");
  }

  const statusColors = {
    connected: "text-emerald-400",
    connecting: "text-amber-400",
    disconnected: "text-[var(--text-muted)]",
  };

  const statusDot = {
    connected: "bg-emerald-400",
    connecting: "bg-amber-400 animate-pulse",
    disconnected: "bg-[var(--text-muted)]",
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-base)" }}
    >
      {/* URL bar */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <div
          className="flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`} />
          <span className={statusColors[status]}>WS</span>
        </div>

        <div
          className="flex-1 flex items-center rounded-lg overflow-hidden"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
          }}
        >
          <input
            type="text"
            value={url}
            onChange={(e) =>
              updateTab(tab.id, {
                url: e.target.value,
                name: e.target.value || "WebSocket",
              })
            }
            placeholder="ws://localhost:8080 or wss://echo.websocket.org"
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
            style={{ color: "var(--text-primary)" }}
            disabled={status !== "disconnected"}
          />
        </div>

        {status === "disconnected" ? (
          <button
            onClick={connect}
            disabled={!url}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <Wifi size={14} />
            Connect
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--error)",
              border: "1px solid var(--border)",
            }}
          >
            <WifiOff size={14} />
            Disconnect
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 flex flex-col gap-1.5 font-mono text-xs">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Wifi size={32} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Connect to a WebSocket endpoint
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Messages will appear here
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${msg.type === "outgoing" ? "flex-row-reverse" : ""}`}
          >
            {msg.type === "incoming" && (
              <ArrowDown size={12} className="shrink-0 mt-1 text-emerald-400" />
            )}
            {msg.type === "outgoing" && (
              <ArrowUp size={12} className="shrink-0 mt-1 text-blue-400" />
            )}
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl break-all leading-relaxed ${
                msg.type === "outgoing"
                  ? "rounded-tr-sm"
                  : msg.type === "incoming"
                    ? "rounded-tl-sm"
                    : "rounded-lg w-full"
              }`}
              style={{
                background:
                  msg.type === "outgoing"
                    ? "var(--accent-subtle)"
                    : msg.type === "incoming"
                      ? "var(--bg-elevated)"
                      : msg.type === "error"
                        ? "rgba(239,68,68,0.1)"
                        : "var(--bg-surface)",
                color:
                  msg.type === "outgoing"
                    ? "var(--accent)"
                    : msg.type === "error"
                      ? "var(--error)"
                      : msg.type === "info"
                        ? "var(--text-muted)"
                        : "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {msg.text}
              <div className="text-[9px] mt-1 opacity-50">
                {new Date(msg.ts).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <button
          onClick={() => setMessages([])}
          className="p-2 rounded-lg transition-colors hover:bg-(--bg-overlay) shrink-0"
          style={{ color: "var(--text-muted)" }}
          title="Clear messages"
        >
          <Trash2 size={14} />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={
            status === "connected"
              ? "Type a message and press Enter..."
              : "Connect first to send messages"
          }
          disabled={status !== "connected"}
          className="flex-1 px-3 py-2 text-sm rounded-lg outline-none disabled:opacity-50"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={status !== "connected" || !input.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: "var(--accent)", color: "white" }}
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  );
}
