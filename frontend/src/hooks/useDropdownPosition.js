// src/hooks/useDropdownPosition.js
import { useState, useCallback } from "react";

export function useDropdownPosition(menuWidth = 192, menuHeight = 120) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const measure = useCallback(
    (ref) => {
      if (!ref) return;
      const rect = ref.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let top = rect.bottom + 4;
      let left = rect.left;

      // Flip above if it would go below viewport
      if (top + menuHeight > vh) top = rect.top - menuHeight - 4;

      // Clamp left so it doesn't overflow right edge
      if (left + menuWidth > vw) left = vw - menuWidth - 8;

      // Never go off left edge
      if (left < 8) left = 8;

      setPos({ top, left });
    },
    [menuWidth, menuHeight],
  );

  return { pos, measure };
}
