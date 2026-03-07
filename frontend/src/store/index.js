import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BUILT_IN_THEMES,
  DEFAULT_THEME_ID,
  applyTheme,
} from "../themes/index.js";

// ─── Theme Store ──────────────────────────────────────────────────────────────
export const useThemeStore = create(
  persist(
    (set, get) => ({
      currentThemeId: DEFAULT_THEME_ID,
      customThemes: [],
      setTheme: (id) => {
        const all = [...BUILT_IN_THEMES, ...get().customThemes];
        const theme = all.find((t) => t.id === id);
        if (theme) {
          applyTheme(theme);
          set({ currentThemeId: id });
        }
      },
      addCustomTheme: (theme) => {
        set((s) => ({ customThemes: [...s.customThemes, theme] }));
      },
      updateCustomTheme: (id, updates) => {
        set((s) => ({
          customThemes: s.customThemes.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        }));
      },
      deleteCustomTheme: (id) => {
        set((s) => ({
          customThemes: s.customThemes.filter((t) => t.id !== id),
        }));
      },
      getAllThemes: () => [...BUILT_IN_THEMES, ...get().customThemes],
    }),
    { name: "restman-theme" },
  ),
);

// ─── Tab Store ────────────────────────────────────────────────────────────────
const newTab = (overrides = {}) => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "New Request",
  customName: false,
  type: "http", // 'http' | 'websocket'
  method: "GET",
  url: "",
  headers: [{ id: 1, key: "", value: "", enabled: true }],
  params: [{ id: 1, key: "", value: "", enabled: true }],
  bodyType: "none", // none | json | text | xml | formdata | urlencoded | binary
  body: "",
  formFields: [{ id: 1, key: "", value: "", type: "text", enabled: true }],
  auth: { type: "none" },
  response: null,
  loading: false,
  ...overrides,
});

export const useTabStore = create((set, get) => ({
  tabs: [newTab()],
  activeTabId: null,
  init() {
    const first = get().tabs[0];
    set({ activeTabId: first.id });
  },
  getActiveTab() {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  },
  addTab(overrides = {}) {
    const tab = newTab(overrides);
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
    return tab.id;
  },
  openOrAddTab(tabData) {
    const { tabs, setActiveTab, addTab } = get();

    // Find a match based on method and URL
    const existing = tabs.find(
      (t) => t.url === tabData.url && t.method === tabData.method,
    );

    if (existing) {
      setActiveTab(existing.id);
    } else {
      addTab(tabData);
    }
  },
  closeTab(id) {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id
          ? tabs[tabs.length - 1]?.id || null
          : s.activeTabId;
      return { tabs: tabs.length ? tabs : [newTab()], activeTabId };
    });
    // Fix: if no tabs left, re-init
    if (!get().tabs.length) {
      const tab = newTab();
      set({ tabs: [tab], activeTabId: tab.id });
    }
  },
  closeOthers(id) {
    set((s) => ({
      tabs: s.tabs.filter((t) => t.id === id),
      activeTabId: id,
    }));
  },
  closeAll() {
    const tab = newTab();
    set({ tabs: [tab], activeTabId: tab.id });
  },
  setActiveTab(id) {
    set({ activeTabId: id });
  },
  updateTab(id, updates) {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },
  duplicateTab(id) {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    const dup = {
      ...tab,
      id: `tab-${Date.now()}`,
      name: "Copy of " + tab.name,
      response: null,
    };
    set((s) => ({ tabs: [...s.tabs, dup], activeTabId: dup.id }));
  },
  renameTab(id, newName) {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, name: newName, customName: true } : t,
      ),
    }));
  },
}));

// ─── Environment Store ────────────────────────────────────────────────────────
export const useEnvStore = create(
  persist(
    (set, get) => ({
      environments: [],
      activeEnvId: null,
      globalVariables: [],
      loaded: false,
      setLoaded: (v) => set({ loaded: v }),
      setEnvironments: (envs) => set({ environments: envs }),
      setActiveEnv: (id) => set({ activeEnvId: id }),
      setGlobalVariables: (vars) => set({ globalVariables: vars }),
      getActiveEnv() {
        return get().environments.find((e) => e._id === get().activeEnvId);
      },
      resolveVariables(str) {
        if (!str) return str;
        const env = get().getActiveEnv();
        const vars = [
          ...get().globalVariables,
          ...(env?.variables || []),
        ].filter((v) => v.enabled !== false);
        return vars.reduce((acc, { key, value }) => {
          return acc.replaceAll(`{{${key}}}`, value || "");
        }, str);
      },
      unresolveVariables(str) {
        if (!str) return str;

        const env = get().getActiveEnv();
        const vars = [
          ...get().globalVariables,
          ...(env?.variables || []),
        ].filter((v) => v.enabled !== false && v.value); // Only use enabled vars with actual values

        // SORTING IS KEY: Sort by value length (Longest -> Shortest)
        // This prevents 'https://' from being replaced by {{protocol}}
        // before 'https://api.com' is replaced by {{base_url}}.
        const sortedVars = [...vars].sort(
          (a, b) => b.value.length - a.value.length,
        );

        return sortedVars.reduce((acc, { key, value }) => {
          // We use the literal 'value' string directly.
          // .replaceAll() treats it as text, not a RegEx pattern.
          return acc.replaceAll(value, `{{${key}}}`);
        }, str);
      },
    }),
    {
      name: "restman-env-active",
      partialize: (s) => ({ activeEnvId: s.activeEnvId }),
    },
  ),
);

// ─── Collection Store ─────────────────────────────────────────────────────────
export const useCollectionStore = create((set) => ({
  collections: [],
  loaded: false,
  setCollections: (c) => set({ collections: c, loaded: true }),
  addCollection: (c) => set((s) => ({ collections: [c, ...s.collections] })),
  updateCollection: (id, updates) =>
    set((s) => ({
      collections: s.collections.map((c) =>
        c._id === id ? { ...c, ...updates } : c,
      ),
    })),
  removeCollection: (id) =>
    set((s) => ({
      collections: s.collections.filter((c) => c._id !== id),
    })),
}));

// ─── History Store ────────────────────────────────────────────────────────────
export const useHistoryStore = create((set) => ({
  history: [],
  loaded: false,
  setHistory: (h) => set({ history: h, loaded: true }),
  addEntry: (entry) =>
    set((s) => ({ history: [entry, ...s.history].slice(0, 200) })),
  clearHistory: () => set({ history: [] }),
}));

// ─── UI Store ─────────────────────────────────────────────────────────────────
export const useUIStore = create(
  persist(
    (set) => ({
      sidebarWidth: 260,
      sidebarCollapsed: false,
      activeSidebarTab: "collections", // collections | environments | history
      responseTab: "body", // body | headers | cookies | timeline
      requestTab: "params", // params | headers | body | auth | cookies
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setActiveSidebarTab: (t) => set({ activeSidebarTab: t }),
      setResponseTab: (t) => set({ responseTab: t }),
      setRequestTab: (t) => set({ requestTab: t }),
    }),
    { name: "restman-ui" },
  ),
);
