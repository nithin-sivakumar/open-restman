import React, { useRef } from "react";

export default function HeaderValueInput({
  value,
  onChange,
  placeholder,
  style,
}) {
  const inputRef = useRef(null);
  const highlighterRef = useRef(null);

  const handleScroll = () => {
    if (highlighterRef.current && inputRef.current) {
      highlighterRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  const renderHighlightedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        return (
          <span
            key={i}
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--accent)",
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div
      className="relative flex-1 flex items-center overflow-hidden rounded-md"
      style={style}
    >
      {/* GHOST HIGHLIGHTER */}
      <div
        ref={highlighterRef}
        className="absolute inset-0 px-2.5 py-1.5 text-xs pointer-events-none whitespace-pre overflow-hidden flex items-center"
        style={{
          fontFamily: "inherit",
          lineHeight: "normal",
        }}
      >
        <div className="whitespace-pre">{renderHighlightedText(value)}</div>
      </div>

      {/* ACTUAL INPUT */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        placeholder={placeholder}
        spellCheck="false"
        autoComplete="off"
        className="w-full px-2.5 py-1.5 text-xs bg-transparent outline-none relative z-10"
        style={{
          color: "transparent",
          caretColor: "var(--text-primary)",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}
