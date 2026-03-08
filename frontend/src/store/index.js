// src/store/index.js
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
      addCustomTheme: (theme) =>
        set((s) => ({ customThemes: [...s.customThemes, theme] })),
      updateCustomTheme: (id, updates) =>
        set((s) => ({
          customThemes: s.customThemes.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        })),
      deleteCustomTheme: (id) =>
        set((s) => ({
          customThemes: s.customThemes.filter((t) => t.id !== id),
        })),
      getAllThemes: () => [...BUILT_IN_THEMES, ...get().customThemes],
    }),
    { name: "restman-theme" },
  ),
);

// ─── Tab Store ────────────────────────────────────────────────────────────────
export const newTab = (overrides = {}) => ({
  id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "New Request",
  customName: false,
  type: "http",
  method: "GET",
  url: "",
  headers: [{ id: 1, key: "", value: "", enabled: true }],
  params: [{ id: 1, key: "", value: "", enabled: true }],
  bodyType: "none",
  body: "",
  formFields: [{ id: 1, key: "", value: "", type: "text", enabled: true }],
  auth: { type: "none" },
  response: null,
  loading: false,
  collectionId: null,
  requestId: null,
  folderId: null,
  isDirty: false,
  ...overrides,
});

const TABS_STORAGE_KEY = "restman-tabs-v2";

function loadPersistedTabs() {
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.tabs || !parsed.tabs.length) return null;
    const tabs = parsed.tabs.map((t) => ({
      ...t,
      loading: false,
      response: null,
    }));
    return { tabs, activeTabId: parsed.activeTabId };
  } catch {
    return null;
  }
}

function saveTabsToPersist(tabs, activeTabId) {
  try {
    localStorage.setItem(
      TABS_STORAGE_KEY,
      JSON.stringify({ tabs, activeTabId }),
    );
  } catch {}
}

const persisted = loadPersistedTabs();
const initialTabs = persisted?.tabs || [newTab()];
const initialActiveTabId = persisted?.activeTabId || initialTabs[0]?.id || null;

export const useTabStore = create((set, get) => ({
  tabs: initialTabs,
  activeTabId: initialActiveTabId,
  init() {
    const { tabs, activeTabId } = get();
    const validActiveId = tabs.find((t) => t.id === activeTabId)
      ? activeTabId
      : tabs[0]?.id || null;
    set({ activeTabId: validActiveId });
  },
  getActiveTab() {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  },
  addTab(overrides = {}) {
    const tab = newTab(overrides);
    set((s) => {
      const newTabs = [...s.tabs, tab];
      saveTabsToPersist(newTabs, tab.id);
      return { tabs: newTabs, activeTabId: tab.id };
    });
    return tab.id;
  },
  openOrAddTab(tabData) {
    const { tabs, setActiveTab, addTab } = get();
    // If request has a requestId, find existing tab for it
    if (tabData.requestId) {
      const existing = tabs.find(
        (t) =>
          t.requestId === tabData.requestId &&
          t.collectionId === tabData.collectionId,
      );
      if (existing) {
        setActiveTab(existing.id);
        return;
      }
    } else {
      // For unsaved, match by url+method+type+name
      const byContent = tabs.find(
        (t) =>
          t.url === tabData.url &&
          t.method === tabData.method &&
          t.type === tabData.type &&
          t.name === tabData.name,
      );
      if (byContent) {
        setActiveTab(byContent.id);
        return;
      }
    }
    addTab(tabData);
  },
  closeTab(id) {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id);
      const activeTabId =
        s.activeTabId === id
          ? tabs[tabs.length - 1]?.id || null
          : s.activeTabId;
      saveTabsToPersist(tabs, activeTabId);
      return { tabs, activeTabId };
    });
  },
  closeOthers(id) {
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id === id);
      saveTabsToPersist(tabs, id);
      return { tabs, activeTabId: id };
    });
  },
  closeAll() {
    saveTabsToPersist([], null);
    set({ tabs: [], activeTabId: null });
  },
  setActiveTab(id) {
    set((s) => {
      saveTabsToPersist(s.tabs, id);
      return { activeTabId: id };
    });
  },
  updateTab(id, updates) {
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              ...updates,
              isDirty:
                updates.isDirty !== undefined
                  ? updates.isDirty
                  : t.collectionId
                    ? true
                    : t.isDirty,
            }
          : t,
      );
      saveTabsToPersist(tabs, s.activeTabId);
      return { tabs };
    });
  },
  markTabSaved(id, { collectionId, requestId, folderId }) {
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.id === id
          ? { ...t, collectionId, requestId, folderId, isDirty: false }
          : t,
      );
      saveTabsToPersist(tabs, s.activeTabId);
      return { tabs };
    });
  },
  markTabClean(id) {
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.id === id ? { ...t, isDirty: false } : t,
      );
      saveTabsToPersist(tabs, s.activeTabId);
      return { tabs };
    });
  },
  duplicateTab(id) {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    const dup = {
      ...tab,
      id: `tab-${Date.now()}`,
      name: "Copy of " + tab.name,
      response: null,
      collectionId: null,
      requestId: null,
      folderId: null,
      isDirty: false,
    };
    set((s) => {
      const tabs = [...s.tabs, dup];
      saveTabsToPersist(tabs, dup.id);
      return { tabs, activeTabId: dup.id };
    });
  },
  renameTab(id, newName) {
    set((s) => {
      const tabs = s.tabs.map((t) =>
        t.id === id ? { ...t, name: newName, customName: true } : t,
      );
      saveTabsToPersist(tabs, s.activeTabId);
      return { tabs };
    });
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
        return vars.reduce(
          (acc, { key, value }) => acc.replaceAll(`{{${key}}}`, value || ""),
          str,
        );
      },
      unresolveVariables(str) {
        if (!str) return str;
        const env = get().getActiveEnv();
        const vars = [
          ...get().globalVariables,
          ...(env?.variables || []),
        ].filter((v) => v.enabled !== false && v.value);
        const sortedVars = [...vars].sort(
          (a, b) => b.value.length - a.value.length,
        );
        return sortedVars.reduce(
          (acc, { key, value }) => acc.replaceAll(value, `{{${key}}}`),
          str,
        );
      },
    }),
    {
      name: "restman-env-active",
      partialize: (s) => ({ activeEnvId: s.activeEnvId }),
    },
  ),
);

// ─── Collection Store ─────────────────────────────────────────────────────────
export const useCollectionStore = create((set, get) => ({
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
    set((s) => ({ collections: s.collections.filter((c) => c._id !== id) })),
  getCollection: (id) => get().collections.find((c) => c._id === id),
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
      activeSidebarTab: "collections",
      responseTab: "body",
      requestTab: "params",
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setActiveSidebarTab: (t) => set({ activeSidebarTab: t }),
      setResponseTab: (t) => set({ responseTab: t }),
      setRequestTab: (t) => set({ requestTab: t }),
    }),
    { name: "restman-ui" },
  ),
);
