import { useState, useEffect, useRef } from "react";
import {
  Send,
  Wifi,
  WifiOff,
  Trash2,
  ArrowDown,
  ArrowUp,
  Save,
} from "lucide-react";
import { useTabStore } from "../../store/index.js";
import SaveRequestModal from "../collections/SaveRequestModal.jsx";

export default function WSPanel({ tab }) {
  const { updateTab } = useTabStore();
  const [status, setStatus] = useState("disconnected"); // disconnected | connecting | connected
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const url = tab?.url || "";

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (tab.wsMessages) {
      setMessages(tab.wsMessages);
    }
  }, [tab.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); // stop browser save page
        setShowSaveModal(true); // open your save modal
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function connect() {
    if (!url) return;
    if (status === "connecting" || status === "connected") return;
    setStatus("connecting");
    setMessages((m) => {
      const next = [
        ...m,
        { type: "info", text: `Connecting to ${url}...`, ts: Date.now() },
      ];
      updateTab(tab.id, { wsMessages: next });
      return next;
    });

    try {
      wsRef.current?.close();
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
            setMessages((m) => {
              const next = [
                ...m,
                { type: "info", text: "Connected ✓", ts: Date.now() },
              ];
              updateTab(tab.id, { wsMessages: next });
              return next;
            });
          } else if (msg.type === "connecting") {
            setMessages((m) => {
              {
                const next = [
                  ...m,
                  {
                    type: "info",
                    text: msg.message || "Connecting...",
                    ts: Date.now(),
                  },
                ];
                updateTab(tab.id, { wsMessages: next });
                return next;
              }
            });
          } else if (msg.type === "message") {
            let formatted = msg.data;

            try {
              formatted = JSON.stringify(JSON.parse(msg.data), null, 2);
            } catch {}

            setMessages((m) => {
              const next = [
                ...m,
                {
                  type: msg.direction === "outgoing" ? "outgoing" : "incoming",
                  text: formatted,
                  size: new Blob([msg.data]).size,
                  ts: msg.timestamp || Date.now(),
                },
              ];

              updateTab(tab.id, { wsMessages: next });
              return next;
            });
          } else if (msg.type === "disconnected") {
            setStatus("disconnected");
            setMessages((m) => {
              const next = [
                ...m,
                {
                  type: "info",
                  text: `Disconnected (code: ${msg.code})`,
                  ts: Date.now(),
                },
              ];
              updateTab(tab.id, { wsMessages: next });
              return next;
            });
          } else if (msg.type === "error") {
            setStatus("disconnected");
            setMessages((m) => {
              const next = [
                ...m,
                { type: "error", text: msg.message, ts: Date.now() },
              ];
              updateTab(tab.id, { wsMessages: next });
              return next;
            });
          }
        } catch {
          const text = typeof e.data === "string" ? e.data : "[binary message]";

          setMessages((m) => {
            const next = [...m, { type: "incoming", text, ts: Date.now() }];
            updateTab(tab.id, { wsMessages: next });
            return next;
          });
        }
      };

      ws.onerror = () => {
        setStatus("disconnected");
        setMessages((m) => {
          const next = [
            ...m,
            { type: "error", text: "WebSocket error occurred", ts: Date.now() },
          ];
          updateTab(tab.id, { wsMessages: next });
          return next;
        });
      };

      ws.onclose = () => {
        setStatus("disconnected");
      };
    } catch (err) {
      setStatus("disconnected");
      setMessages((m) => {
        const next = [
          ...m,
          { type: "error", text: err.message, ts: Date.now() },
        ];
        updateTab(tab.id, { wsMessages: next });
        return next;
      });
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

        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
          style={{
            background: "var(--bg-overlay)",
            color: "var(--text-muted)",
          }}
          title="Save WebSocket Session"
        >
          <Save size={13} />
        </button>

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

      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter messages..."
          className="flex-1 px-2 py-1 text-xs rounded-md outline-none"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
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

        {messages
          .filter((m) =>
            filter ? m.text.toLowerCase().includes(filter.toLowerCase()) : true,
          )
          .map((msg, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 ${msg.type === "outgoing" ? "flex-row-reverse" : ""}`}
            >
              {msg.type === "incoming" && (
                <ArrowDown
                  size={12}
                  className="shrink-0 mt-1 text-emerald-400"
                />
              )}
              {msg.type === "outgoing" && (
                <ArrowUp size={12} className="shrink-0 mt-1 text-blue-400" />
              )}
              <button
                onClick={() => {
                  setInput(msg.text);
                }}
                className="ml-2 opacity-50 hover:opacity-100"
                title="Replay message"
              >
                ↺
              </button>
              <div
                onClick={() => navigator.clipboard.writeText(msg.text)}
                title="Click to copy"
                className={`px-3 py-2 rounded-xl break-all leading-relaxed cursor-pointer ${
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
                  {msg.size && ` • ${msg.size} B`}
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
      {showSaveModal && (
        <SaveRequestModal
          tab={tab}
          requestType="websocket"
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
