import { useState, useCallback } from "react";

export function useDropdownPosition() {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const measure = useCallback((ref) => {
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, []);

  return { pos, measure };
}
