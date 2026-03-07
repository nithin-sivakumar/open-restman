import { useEffect } from "react";
import { BookOpen, Globe, Clock, FolderOpen } from "lucide-react";
import {
  useUIStore,
  useCollectionStore,
  useEnvStore,
  useHistoryStore,
} from "../../store/index.js";
import {
  collectionsApi,
  environmentsApi,
  historyApi,
} from "../../utils/api.js";
import CollectionPanel from "../collections/CollectionPanel.jsx";
import EnvironmentPanel from "../environment/EnvironmentPanel.jsx";
import HistoryPanel from "../history/HistoryPanel.jsx";

const TABS = [
  { id: "collections", label: "Collections", icon: BookOpen },
  { id: "environments", label: "Environments", icon: Globe },
  { id: "history", label: "History", icon: Clock },
];

export default function Sidebar() {
  const { activeSidebarTab, setActiveSidebarTab } = useUIStore();
  const { setCollections } = useCollectionStore();
  const { setEnvironments } = useEnvStore();
  const { setHistory } = useHistoryStore();

  useEffect(() => {
    collectionsApi.getAll().then(setCollections).catch(console.error);
    environmentsApi.getAll().then(setEnvironments).catch(console.error);
    historyApi.getAll().then(setHistory).catch(console.error);
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--bg-surface)" }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center px-2 pt-2 pb-0 gap-1"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSidebarTab(id)}
            className="hover:scale-105 cursor-pointer flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-t-md transition-colors relative"
            style={{
              color:
                activeSidebarTab === id ? "var(--accent)" : "var(--text-muted)",
              background:
                activeSidebarTab === id ? "var(--bg-elevated)" : "transparent",
              borderBottom:
                activeSidebarTab === id
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
            }}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activeSidebarTab === "collections" && <CollectionPanel />}
        {activeSidebarTab === "environments" && <EnvironmentPanel />}
        {activeSidebarTab === "history" && <HistoryPanel />}
      </div>
    </div>
  );
}
