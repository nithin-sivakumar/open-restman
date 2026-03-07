// src/components/collections/SaveRequestModal.jsx
import { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Globe,
  Wifi,
  Search,
  FolderPlus,
  Check,
} from "lucide-react";
import { useCollectionStore, useTabStore } from "../../store/index.js";
import { collectionsApi } from "../../utils/api.js";
import { generateId } from "../../utils/helpers.js";
import Portal from "../ui/Portal.jsx";

const METHOD_COLORS = {
  GET: "#10b981",
  POST: "#3b82f6",
  PUT: "#f59e0b",
  PATCH: "#a855f7",
  DELETE: "#ef4444",
  HEAD: "#06b6d4",
  OPTIONS: "#ec4899",
  WS: "#10b981",
};

function MethodBadge({ method, type }) {
  if (type === "websocket") {
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
      >
        WS
      </span>
    );
  }
  const color = METHOD_COLORS[method] || "#6366f1";
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: `${color}22`, color }}
    >
      {method}
    </span>
  );
}

/** Recursive folder tree picker */
function FolderTreeItem({
  folder,
  depth = 0,
  selectedId,
  onSelect,
  collectionId,
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasSubs = (folder.folders || []).length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-lg mx-1 transition-all"
        style={{
          paddingLeft: `${12 + depth * 16}px`,
          background:
            selectedId === folder.id ? "var(--accent-subtle)" : "transparent",
          border:
            selectedId === folder.id
              ? "1px solid var(--accent)"
              : "1px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (selectedId !== folder.id)
            e.currentTarget.style.background = "var(--bg-overlay)";
        }}
        onMouseLeave={(e) => {
          if (selectedId !== folder.id)
            e.currentTarget.style.background = "transparent";
        }}
        onClick={() => onSelect(folder.id === selectedId ? null : folder.id)}
      >
        {hasSubs ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="shrink-0 p-0.5"
          >
            {expanded ? (
              <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
            ) : (
              <ChevronRight size={10} style={{ color: "var(--text-muted)" }} />
            )}
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}
        {expanded ? (
          <FolderOpen
            size={13}
            style={{ color: folder.color || "var(--accent)" }}
          />
        ) : (
          <Folder
            size={13}
            style={{ color: folder.color || "var(--accent)" }}
          />
        )}
        <span
          className="text-xs flex-1 truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {folder.name}
        </span>
        {selectedId === folder.id && (
          <Check size={12} style={{ color: "var(--accent)" }} />
        )}
      </div>
      {expanded && hasSubs && (
        <div>
          {folder.folders.map((sub) => (
            <FolderTreeItem
              key={sub.id}
              folder={sub}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              collectionId={collectionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SaveRequestModal({ tab, onClose }) {
  const { collections, addCollection, updateCollection } = useCollectionStore();
  const { markTabSaved, renameTab } = useTabStore();

  const [step, setStep] = useState("pick"); // 'pick' | 'new-collection'
  const [search, setSearch] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    tab.collectionId || null,
  );
  const [selectedFolderId, setSelectedFolderId] = useState(
    tab.folderId || null,
  );
  const [requestName, setRequestName] = useState(tab.name || "New Request");
  const [expandedCollections, setExpandedCollections] = useState({});
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionColor, setNewCollectionColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(null); // collectionId
  const [newFolderName, setNewFolderName] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
    // Auto-expand collection if already saved there
    if (tab.collectionId) {
      setExpandedCollections({ [tab.collectionId]: true });
    }
  }, []);

  const filteredCollections = collections.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSave() {
    if (!selectedCollectionId || !requestName.trim()) return;
    setSaving(true);
    try {
      const requestData = {
        id: tab.requestId || generateId(),
        name: requestName.trim(),
        method: tab.method,
        url: tab.url || "",
        headers: tab.headers || [],
        params: tab.params || [],
        bodyType: tab.bodyType || "none",
        body: tab.body || "",
        formFields: tab.formFields || [],
        auth: tab.auth || { type: "none" },
        type: tab.type || "http",
        description: "",
      };

      let updatedCollection;

      if (tab.collectionId === selectedCollectionId && tab.requestId) {
        // Already saved — update in place
        updatedCollection = await collectionsApi.updateRequest(
          selectedCollectionId,
          tab.requestId,
          { ...requestData, folderId: selectedFolderId },
        );
      } else {
        // New save
        updatedCollection = await collectionsApi.addRequest(
          selectedCollectionId,
          requestData,
          selectedFolderId,
        );
      }

      updateCollection(selectedCollectionId, {
        requests: updatedCollection.requests,
        folders: updatedCollection.folders,
      });

      markTabSaved(tab.id, {
        collectionId: selectedCollectionId,
        requestId: requestData.id,
        folderId: selectedFolderId,
      });
      renameTab(tab.id, requestName.trim());
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function createCollection() {
    if (!newCollectionName.trim()) return;
    const col = await collectionsApi.create({
      name: newCollectionName.trim(),
      color: newCollectionColor,
    });
    addCollection(col);
    setSelectedCollectionId(col._id);
    setExpandedCollections((s) => ({ ...s, [col._id]: true }));
    setStep("pick");
    setNewCollectionName("");
  }

  async function createFolder(collectionId) {
    if (!newFolderName.trim()) return;
    const folder = { name: newFolderName.trim(), id: generateId() };
    const updated = await collectionsApi.addFolder(collectionId, folder, null);
    updateCollection(collectionId, {
      folders: updated.folders,
      requests: updated.requests,
    });
    setSelectedFolderId(folder.id);
    setCreatingFolder(null);
    setNewFolderName("");
  }

  const PRESET_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f59e0b",
    "#10b981",
    "#14b8a6",
    "#0ea5e9",
  ];

  return (
    <Portal>
      {/* Backdrop */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 10000,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="w-full max-w-2xl mx-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            maxHeight: "85vh",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "var(--accent-subtle)" }}
              >
                <Save size={16} style={{ color: "var(--accent)" }} />
              </div>
              <div>
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Save Request
                </h2>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-muted)" }}
                >
                  Save to a collection for easy access
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-overlay)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <X size={16} />
            </button>
          </div>

          {/* Request name input */}
          <div
            className="px-6 py-4 shrink-0"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <label
              className="text-xs font-medium block mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              REQUEST NAME
            </label>
            <div className="flex items-center gap-2">
              <MethodBadge method={tab.method} type={tab.type} />
              <input
                ref={nameRef}
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                placeholder="Request name..."
              />
            </div>
            {tab.url && (
              <p
                className="text-[10px] mt-1.5 font-mono truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {tab.url}
              </p>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {step === "new-collection" ? (
              /* ── New collection form ── */
              <div className="p-6 flex flex-col gap-4">
                <button
                  onClick={() => setStep("pick")}
                  className="flex items-center gap-1.5 text-xs self-start"
                  style={{ color: "var(--accent)" }}
                >
                  <ChevronRight size={12} className="rotate-180" />
                  Back
                </button>
                <div>
                  <label
                    className="text-xs font-medium block mb-1.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    COLLECTION NAME
                  </label>
                  <input
                    autoFocus
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createCollection()}
                    placeholder="My API Collection"
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-medium block mb-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    COLOR
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewCollectionColor(c)}
                        className="w-7 h-7 rounded-full transition-all"
                        style={{
                          background: c,
                          outline:
                            newCollectionColor === c
                              ? `2px solid ${c}`
                              : "none",
                          outlineOffset: "2px",
                          transform:
                            newCollectionColor === c
                              ? "scale(1.2)"
                              : "scale(1)",
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={newCollectionColor}
                      onChange={(e) => setNewCollectionColor(e.target.value)}
                      className="w-7 h-7 rounded-full cursor-pointer border-0 p-0"
                      title="Custom color"
                    />
                  </div>
                </div>
                <button
                  onClick={createCollection}
                  disabled={!newCollectionName.trim()}
                  className="mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  Create Collection
                </button>
              </div>
            ) : (
              /* ── Pick collection ── */
              <>
                <div className="px-6 pt-4 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <label
                      className="text-xs font-medium"
                      style={{ color: "var(--text-muted)" }}
                    >
                      SAVE TO COLLECTION
                    </label>
                    <div className="flex-1" />
                    <button
                      onClick={() => setStep("new-collection")}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
                      style={{ color: "var(--accent)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--accent-subtle)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Plus size={11} />
                      New Collection
                    </button>
                  </div>
                  {/* Search */}
                  <div
                    className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-lg"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Search size={12} style={{ color: "var(--text-muted)" }} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search collections..."
                      className="flex-1 text-xs bg-transparent outline-none"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                {/* Collection list */}
                <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-0">
                  {filteredCollections.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Folder
                        size={28}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <p
                        className="text-xs text-center"
                        style={{ color: "var(--text-muted)" }}
                      >
                        No collections yet.
                        <br />
                        Create one to start saving requests.
                      </p>
                      <button
                        onClick={() => setStep("new-collection")}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg mt-1"
                        style={{ background: "var(--accent)", color: "white" }}
                      >
                        <Plus size={12} />
                        Create Collection
                      </button>
                    </div>
                  )}

                  {filteredCollections.map((col) => {
                    const isSelected = selectedCollectionId === col._id;
                    const isExpanded = expandedCollections[col._id];
                    const hasFolders = (col.folders || []).length > 0;

                    return (
                      <div key={col._id} className="mb-1">
                        {/* Collection row */}
                        <div
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all"
                          style={{
                            background:
                              isSelected && !selectedFolderId
                                ? "var(--accent-subtle)"
                                : "transparent",
                            border:
                              isSelected && !selectedFolderId
                                ? "1px solid var(--accent)"
                                : "1px solid transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!(isSelected && !selectedFolderId))
                              e.currentTarget.style.background =
                                "var(--bg-overlay)";
                          }}
                          onMouseLeave={(e) => {
                            if (!(isSelected && !selectedFolderId))
                              e.currentTarget.style.background = "transparent";
                          }}
                          onClick={() => {
                            setSelectedCollectionId(col._id);
                            setSelectedFolderId(null);
                            setExpandedCollections((s) => ({
                              ...s,
                              [col._id]: !s[col._id] || true,
                            }));
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCollections((s) => ({
                                ...s,
                                [col._id]: !s[col._id],
                              }));
                            }}
                            className="shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronDown
                                size={12}
                                style={{ color: "var(--text-muted)" }}
                              />
                            ) : (
                              <ChevronRight
                                size={12}
                                style={{ color: "var(--text-muted)" }}
                              />
                            )}
                          </button>

                          <div
                            className="w-5 h-5 rounded-md shrink-0"
                            style={{ background: col.color || "var(--accent)" }}
                          />
                          <span
                            className="flex-1 text-sm font-medium truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {col.name}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {(col.requests || []).length +
                              countAllRequests(col.folders || [])}{" "}
                            requests
                          </span>
                          {isSelected && !selectedFolderId && (
                            <Check
                              size={13}
                              style={{ color: "var(--accent)" }}
                            />
                          )}
                        </div>

                        {/* Folder tree */}
                        {isExpanded && (
                          <div className="ml-2 mt-0.5 mb-1">
                            {(col.folders || []).map((f) => (
                              <FolderTreeItem
                                key={f.id}
                                folder={f}
                                depth={0}
                                selectedId={
                                  selectedCollectionId === col._id
                                    ? selectedFolderId
                                    : null
                                }
                                onSelect={(fid) => {
                                  setSelectedCollectionId(col._id);
                                  setSelectedFolderId(fid);
                                }}
                                collectionId={col._id}
                              />
                            ))}

                            {/* New folder row */}
                            {creatingFolder === col._id ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 ml-1">
                                <FolderPlus
                                  size={12}
                                  style={{ color: "var(--accent)" }}
                                />
                                <input
                                  autoFocus
                                  value={newFolderName}
                                  onChange={(e) =>
                                    setNewFolderName(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      createFolder(col._id);
                                    if (e.key === "Escape") {
                                      setCreatingFolder(null);
                                      setNewFolderName("");
                                    }
                                  }}
                                  placeholder="Folder name..."
                                  className="flex-1 text-xs bg-transparent outline-none border-b"
                                  style={{
                                    color: "var(--text-primary)",
                                    borderColor: "var(--accent)",
                                  }}
                                />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCreatingFolder(col._id);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1 ml-1 text-xs rounded-lg transition-colors w-full"
                                style={{ color: "var(--text-muted)" }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.color =
                                    "var(--accent)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.color =
                                    "var(--text-muted)")
                                }
                              >
                                <FolderPlus size={11} />
                                Add folder
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {step === "pick" && (
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {selectedCollectionId
                  ? selectedFolderId
                    ? `Saving to folder in ${collections.find((c) => c._id === selectedCollectionId)?.name}`
                    : `Saving to ${collections.find((c) => c._id === selectedCollectionId)?.name} (root)`
                  : "Select a collection above"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-overlay)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    !selectedCollectionId || !requestName.trim() || saving
                  }
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {saving ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Save size={13} />
                  )}
                  {tab.collectionId && tab.requestId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

function countAllRequests(folders) {
  let count = 0;
  for (const f of folders) {
    count += (f.requests || []).length;
    count += countAllRequests(f.folders || []);
  }
  return count;
}
