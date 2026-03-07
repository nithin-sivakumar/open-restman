import { useEffect } from "react";
import { useThemeStore } from "./store/index.js";
import { BUILT_IN_THEMES, applyTheme } from "./themes/index.js";
import AppShell from "./components/layout/AppShell.jsx";

export default function App() {
  const { currentThemeId, customThemes } = useThemeStore();

  useEffect(() => {
    const all = [...BUILT_IN_THEMES, ...customThemes];
    const theme = all.find((t) => t.id === currentThemeId) || all[0];
    if (theme) applyTheme(theme);
  }, [currentThemeId, customThemes]);

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "'Inter var', 'Inter', system-ui, sans-serif",
      }}
    >
      <AppShell />
    </div>
  );
}
