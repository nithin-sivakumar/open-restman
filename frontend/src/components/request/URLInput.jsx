import React, { useRef, useEffect } from "react";

export default function VariableInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
}) {
  const inputRef = useRef(null);
  const highlighterRef = useRef(null);

  // Sync the horizontal scroll of the highlight layer with the input
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
    <div className="relative flex-1 flex items-center overflow-hidden h-full">
      {/* HIGHLIGHTER LAYER (Behind) */}
      <div
        ref={highlighterRef}
        className="absolute inset-0 px-3 py-2 text-sm pointer-events-none whitespace-pre overflow-hidden"
        style={{
          fontFamily: "inherit",
          lineHeight: "normal",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span className="opacity-0">placeholder</span>{" "}
        {/* Hidden spacer to match input padding exactly */}
        <div className="absolute left-3 right-3 truncate whitespace-pre">
          {renderHighlightedText(value)}
        </div>
      </div>

      {/* ACTUAL INPUT (Front) */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        className="w-full px-3 py-2 text-sm bg-transparent outline-none relative z-10 overflow-x-scroll"
        style={{
          color: "transparent",
          caretColor: "var(--text-primary)", // Caret stays visible
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}
