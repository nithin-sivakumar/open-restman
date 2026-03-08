// src/components/response/ResponseTimingBar.jsx
// Feature: sparkline of recent response times for the active tab
import { useMemo, useRef, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ResponseTimingBar({ timings }) {
  // timings: array of numbers (ms) — last N runs
  if (!timings || timings.length < 2) return null;
  const max = Math.max(...timings, 1);
  const last = timings[timings.length - 1];
  const prev = timings[timings.length - 2];
  const delta = last - prev;
  const pct = Math.round((Math.abs(delta) / (prev || 1)) * 100);
  const TrendIcon =
    delta > 20 ? TrendingUp : delta < -20 ? TrendingDown : Minus;
  const trendColor =
    delta > 20
      ? "var(--error)"
      : delta < -20
        ? "var(--success)"
        : "var(--text-muted)";

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5"
      style={{ borderTop: "1px solid var(--border-subtle)" }}
    >
      <span
        className="text-[10px] font-medium shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        TIMING
      </span>
      <div className="flex items-end gap-0.5 h-5 flex-1">
        {timings.map((t, i) => {
          const h = Math.max(4, Math.round((t / max) * 20));
          const isLast = i === timings.length - 1;
          return (
            <div
              key={i}
              title={`${t}ms`}
              className="rounded-sm transition-all cursor-default"
              style={{
                height: h,
                flex: 1,
                minWidth: 3,
                background: isLast ? "var(--accent)" : "var(--border)",
                opacity: isLast ? 1 : 0.5 + (i / timings.length) * 0.5,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <TrendIcon size={11} style={{ color: trendColor }} />
        <span className="text-[10px]" style={{ color: trendColor }}>
          {pct}%
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {last}ms
        </span>
      </div>
    </div>
  );
}
