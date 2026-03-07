import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { getMethodBg } from "../../utils/helpers.js";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const METHOD_COLORS = {
  GET: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  POST: { text: "text-blue-400", bg: "bg-blue-500/10 hover:bg-blue-500/20" },
  PUT: { text: "text-amber-400", bg: "bg-amber-500/10 hover:bg-amber-500/20" },
  PATCH: {
    text: "text-purple-400",
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
  },
  DELETE: { text: "text-red-400", bg: "bg-red-500/10 hover:bg-red-500/20" },
  HEAD: { text: "text-cyan-400", bg: "bg-cyan-500/10 hover:bg-cyan-500/20" },
  OPTIONS: { text: "text-pink-400", bg: "bg-pink-500/10 hover:bg-pink-500/20" },
};

export default function MethodSelector({ method = "GET", onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const colors = METHOD_COLORS[method] || METHOD_COLORS.GET;

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${colors.bg} ${colors.text}`}
        style={{ border: "1px solid var(--border)" }}
      >
        {method}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden shadow-2xl min-w-30"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          {METHODS.map((m) => {
            const c = METHOD_COLORS[m];
            return (
              <button
                key={m}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors ${c.bg} ${c.text}`}
              >
                {m}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
