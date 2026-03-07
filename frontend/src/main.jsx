import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BUILT_IN_THEMES, applyTheme } from "./themes/index.js";

const saved = JSON.parse(localStorage.getItem("restman-theme") || "{}");
const themeId = saved?.state?.currentThemeId || "obsidian";
const all = BUILT_IN_THEMES;
const theme = all.find((t) => t.id === themeId) || all[0];
applyTheme(theme);

createRoot(document.getElementById("root")).render(<App />);
