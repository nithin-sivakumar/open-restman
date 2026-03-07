// src/components/collections/CollectionPanel.jsx
import { useState, useRef, useCallback } from "react";
import {
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit2,
  Globe,
  Wifi,
  FolderPlus,
  Copy,
  MoveRight,
  Palette,
  Tag,
  Check,
  X,
} from "lucide-react";
import { useCollectionStore, useTabStore } from "../../store/index.js";
import { collectionsApi } from "../../utils/api.js";
import { generateId, getMethodColor } from "../../utils/helpers.js";
import Portal from "../ui/Portal.jsx";

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#f97316",
  "#84cc16",
  "#a855f7",
  "#06b6d4",
];

const METHOD_TEXT_COLORS = {
  GET: "text-emerald-400",
  POST: "text-blue-400",
  PUT: "text-amber-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
  HEAD: "text-cyan-400",
  OPTIONS: "text-pink-400",
};

// ── Context Menu ──────────────────────────────────────────────────────────────

function CtxMenu({ x, y, items, onClose }) {
  return (
    <Portal>
      <div
        className="fixed inset-0"
        style={{ zIndex: 10001 }}
        onMouseDown={onClose}
      />
      <div
        className="fixed rounded-xl overflow-hidden shadow-2xl py-1"
        style={{
          top: y,
          left: x,
          zIndex: 10002,
          minWidth: 180,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        {items.map((item, i) =>
          item === "---" ? (
            <div
              key={i}
              className="my-1 mx-2"
              style={{ height: 1, background: "var(--border-subtle)" }}
            />
          ) : (
            <button
              key={item.label}
              onClick={() => {
                item.action();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
              style={{
                color: item.danger ? "var(--error)" : "var(--text-secondary)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--bg-overlay)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {item.icon && <item.icon size={12} />}
              {item.label}
            </button>
          ),
        )}
      </div>
    </Portal>
  );
}

// ── Color Picker Popover ──────────────────────────────────────────────────────

function ColorPicker({ current, onChange, onClose, anchorRect }) {
  return (
    <Portal>
      <div
        className="fixed inset-0"
        style={{ zIndex: 10003 }}
        onMouseDown={onClose}
      />
      <div
        className="fixed rounded-xl p-3 shadow-2xl"
        style={{
          top: anchorRect.bottom + 4,
          left: anchorRect.left,
          zIndex: 10004,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          width: 180,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p
          className="text-[10px] font-semibold mb-2"
          style={{ color: "var(--text-muted)" }}
        >
          PICK COLOR
        </p>
        <div className="grid grid-cols-6 gap-1.5 mb-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onChange(c);
                onClose();
              }}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                background: c,
                outline: current === c ? `2px solid ${c}` : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
        <input
          type="color"
          value={current || "#6366f1"}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onClose}
          className="w-full h-7 rounded cursor-pointer border-0"
          style={{ background: "var(--bg-input)" }}
        />
      </div>
    </Portal>
  );
}

// ── Inline Rename Input ───────────────────────────────────────────────────────

function InlineRename({ value, onSave, onCancel }) {
  const [val, setVal] = useState(value);
  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSave(val.trim() || value);
        if (e.key === "Escape") onCancel();
        e.stopPropagation();
      }}
      onBlur={() => onSave(val.trim() || value)}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 min-w-0 text-xs px-1.5 py-0.5 rounded outline-none"
      style={{
        background: "var(--bg-input)",
        border: "1px solid var(--accent)",
        color: "var(--text-primary)",
      }}
    />
  );
}

// ── Move To Modal ─────────────────────────────────────────────────────────────

function MovePicker({ item, itemType, sourceCollectionId, onClose }) {
  const { collections, updateCollection } = useCollectionStore();
  const [targetCollectionId, setTargetCollectionId] =
    useState(sourceCollectionId);
  const [targetFolderId, setTargetFolderId] = useState(null);
  const [expanded, setExpanded] = useState({ [sourceCollectionId]: true });

  async function handleMove() {
    if (itemType === "request") {
      // Remove from source, add to target
      const srcUpdated = await collectionsApi.deleteRequest(
        sourceCollectionId,
        item.id,
      );
      updateCollection(sourceCollectionId, {
        requests: srcUpdated.requests,
        folders: srcUpdated.folders,
      });
      const dstUpdated = await collectionsApi.addRequest(
        targetCollectionId,
        item,
        targetFolderId,
      );
      updateCollection(targetCollectionId, {
        requests: dstUpdated.requests,
        folders: dstUpdated.folders,
      });
    }
    onClose();
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{
          zIndex: 10010,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(3px)",
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="w-80 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Move to…
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={14} />
            </button>
          </div>
          <div className="p-3 max-h-80 overflow-y-auto">
            {collections.map((col) => (
              <div key={col._id}>
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background:
                      targetCollectionId === col._id && !targetFolderId
                        ? "var(--accent-subtle)"
                        : "transparent",
                  }}
                  onClick={() => {
                    setTargetCollectionId(col._id);
                    setTargetFolderId(null);
                    setExpanded((s) => ({ ...s, [col._id]: true }));
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded((s) => ({ ...s, [col._id]: !s[col._id] }));
                    }}
                  >
                    {expanded[col._id] ? (
                      <ChevronDown
                        size={11}
                        style={{ color: "var(--text-muted)" }}
                      />
                    ) : (
                      <ChevronRight
                        size={11}
                        style={{ color: "var(--text-muted)" }}
                      />
                    )}
                  </button>
                  <div
                    className="w-4 h-4 rounded"
                    style={{ background: col.color || "var(--accent)" }}
                  />
                  <span
                    className="text-xs font-medium flex-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {col.name}
                  </span>
                  {targetCollectionId === col._id && !targetFolderId && (
                    <Check size={11} style={{ color: "var(--accent)" }} />
                  )}
                </div>
                {expanded[col._id] &&
                  (col.folders || []).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer ml-4 transition-colors"
                      style={{
                        background:
                          targetFolderId === f.id
                            ? "var(--accent-subtle)"
                            : "transparent",
                      }}
                      onClick={() => {
                        setTargetCollectionId(col._id);
                        setTargetFolderId(f.id);
                      }}
                    >
                      <Folder
                        size={11}
                        style={{ color: f.color || "var(--warning)" }}
                      />
                      <span
                        className="text-xs flex-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {f.name}
                      </span>
                      {targetFolderId === f.id && (
                        <Check size={11} style={{ color: "var(--accent)" }} />
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
          <div
            className="flex gap-2 px-4 py-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              onClick={onClose}
              className="flex-1 py-1.5 rounded-lg text-xs"
              style={{
                color: "var(--text-muted)",
                background: "var(--bg-overlay)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Move
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Request Node ──────────────────────────────────────────────────────────────

function RequestNode({ request, collectionId, depth = 0, folderId, onOpen }) {
  const { updateCollection } = useCollectionStore();
  const [ctxMenu, setCtxMenu] = useState(null);
  const [showMove, setShowMove] = useState(false);
  const [renaming, setRenaming] = useState(false);

  function openCtx(e) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  async function handleDelete() {
    const updated = await collectionsApi.deleteRequest(
      collectionId,
      request.id,
    );
    updateCollection(collectionId, {
      requests: updated.requests,
      folders: updated.folders,
    });
  }

  async function handleRename(newName) {
    setRenaming(false);
    if (newName === request.name) return;
    const updated = await collectionsApi.updateRequest(
      collectionId,
      request.id,
      { name: newName },
    );
    updateCollection(collectionId, {
      requests: updated.requests,
      folders: updated.folders,
    });
  }

  async function handleDuplicate() {
    const dup = {
      ...request,
      id: generateId(),
      name: `Copy of ${request.name}`,
    };
    const updated = await collectionsApi.addRequest(
      collectionId,
      dup,
      folderId || null,
    );
    updateCollection(collectionId, {
      requests: updated.requests,
      folders: updated.folders,
    });
  }

  const methodColor =
    request.type === "websocket"
      ? "text-emerald-400"
      : METHOD_TEXT_COLORS[request.method] || "text-zinc-400";

  const ctxItems = [
    { label: "Open", icon: Globe, action: onOpen },
    { label: "Rename", icon: Edit2, action: () => setRenaming(true) },
    { label: "Duplicate", icon: Copy, action: handleDuplicate },
    { label: "Move to…", icon: MoveRight, action: () => setShowMove(true) },
    "---",
    { label: "Delete", icon: Trash2, action: handleDelete, danger: true },
  ];

  return (
    <>
      <div
        className="flex items-center gap-1.5 rounded-lg cursor-pointer group transition-colors ml-4"
        style={{
          paddingLeft: `${8 + depth * 12}px`,
          paddingRight: 4,
          paddingTop: 5,
          paddingBottom: 5,
        }}
        onClick={onOpen}
        onContextMenu={openCtx}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-elevated)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {request.type === "websocket" ? (
          <span className="text-[9px] font-bold shrink-0 text-emerald-400">
            WS
          </span>
        ) : (
          <span className={`text-[9px] font-bold shrink-0 ${methodColor}`}>
            {request.method || "GET"}
          </span>
        )}
        {renaming ? (
          <InlineRename
            value={request.name}
            onSave={handleRename}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            className="text-xs truncate flex-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {request.name}
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openCtx(e);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--bg-overlay)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <MoreHorizontal size={11} />
        </button>
      </div>

      {ctxMenu && (
        <CtxMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
      {showMove && (
        <MovePicker
          item={request}
          itemType="request"
          sourceCollectionId={collectionId}
          onClose={() => setShowMove(false)}
        />
      )}
    </>
  );
}

// ── Folder Node (recursive) ───────────────────────────────────────────────────

function FolderNode({
  folder,
  collectionId,
  depth = 0,
  parentFolderId,
  onOpenRequest,
}) {
  const { updateCollection } = useCollectionStore();
  const [expanded, setExpanded] = useState(depth < 1);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [addingRequest, setAddingRequest] = useState(null); // 'http' | 'websocket' | null
  const [addingSubfolder, setAddingSubfolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [colorPicker, setColorPicker] = useState(null); // anchor rect
  const rowRef = useRef(null);

  function openCtx(e) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  async function handleRename(newName) {
    setRenaming(false);
    if (newName === folder.name) return;
    const updated = await collectionsApi.updateFolder(collectionId, folder.id, {
      name: newName,
    });
    updateCollection(collectionId, {
      folders: updated.folders,
      requests: updated.requests,
    });
  }

  async function handleColorChange(color) {
    const updated = await collectionsApi.updateFolder(collectionId, folder.id, {
      color,
    });
    updateCollection(collectionId, {
      folders: updated.folders,
      requests: updated.requests,
    });
  }

  async function handleDelete() {
    const updated = await collectionsApi.deleteFolder(collectionId, folder.id);
    updateCollection(collectionId, {
      folders: updated.folders,
      requests: updated.requests,
    });
  }

  async function addRequest(type) {
    if (!newItemName.trim()) return;
    const req = {
      id: generateId(),
      name: newItemName.trim(),
      method: "GET",
      url: "",
      type: type || "http",
    };
    const updated = await collectionsApi.addRequest(
      collectionId,
      req,
      folder.id,
    );
    updateCollection(collectionId, {
      requests: updated.requests,
      folders: updated.folders,
    });
    setAddingRequest(null);
    setNewItemName("");
    setExpanded(true);
  }

  async function addSubfolder() {
    if (!newItemName.trim()) return;
    const subfolder = { id: generateId(), name: newItemName.trim() };
    const updated = await collectionsApi.addFolder(
      collectionId,
      subfolder,
      folder.id,
    );
    updateCollection(collectionId, {
      folders: updated.folders,
      requests: updated.requests,
    });
    setAddingSubfolder(false);
    setNewItemName("");
    setExpanded(true);
  }

  async function handleDuplicate() {
    // Deep-clone with new IDs
    function reId(f) {
      return {
        ...f,
        id: generateId(),
        folders: (f.folders || []).map(reId),
        requests: (f.requests || []).map((r) => ({ ...r, id: generateId() })),
      };
    }
    const duped = reId({ ...folder, name: `Copy of ${folder.name}` });
    const updated = await collectionsApi.addFolder(
      collectionId,
      duped,
      parentFolderId || null,
    );
    updateCollection(collectionId, {
      folders: updated.folders,
      requests: updated.requests,
    });
  }

  const hasSubs = (folder.folders || []).length > 0;
  const hasRequests = (folder.requests || []).length > 0;
  const folderColor = folder.color || "var(--warning)";

  const ctxItems = [
    {
      label: "Add HTTP Request",
      icon: Globe,
      action: () => {
        setAddingRequest("http");
        setExpanded(true);
      },
    },
    {
      label: "Add WebSocket",
      icon: Wifi,
      action: () => {
        setAddingRequest("websocket");
        setExpanded(true);
      },
    },
    {
      label: "Add Subfolder",
      icon: FolderPlus,
      action: () => {
        setAddingSubfolder(true);
        setExpanded(true);
      },
    },
    "---",
    { label: "Rename", icon: Edit2, action: () => setRenaming(true) },
    {
      label: "Change Color",
      icon: Palette,
      action: () => {
        const rect = rowRef.current?.getBoundingClientRect();
        setColorPicker(rect);
      },
    },
    { label: "Duplicate", icon: Copy, action: handleDuplicate },
    "---",
    {
      label: "Delete Folder",
      icon: Trash2,
      action: handleDelete,
      danger: true,
    },
  ];

  return (
    <div>
      {/* Folder header */}
      <div
        ref={rowRef}
        className="flex items-center gap-1.5 rounded-lg cursor-pointer group transition-colors"
        style={{
          paddingLeft: `${8 + depth * 12}px`,
          paddingRight: 4,
          paddingTop: 5,
          paddingBottom: 5,
        }}
        onClick={() => setExpanded(!expanded)}
        onContextMenu={openCtx}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-elevated)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
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
        {expanded ? (
          <FolderOpen size={13} style={{ color: folderColor }} />
        ) : (
          <Folder size={13} style={{ color: folderColor }} />
        )}

        {renaming ? (
          <InlineRename
            value={folder.name}
            onSave={handleRename}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            className="text-xs font-medium flex-1 truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {folder.name}
          </span>
        )}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAddingRequest("http");
              setExpanded(true);
            }}
            className="p-0.5 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-overlay)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
            title="Add Request"
          >
            <Plus size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCtx(e);
            }}
            className="p-0.5 rounded transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-overlay)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <MoreHorizontal size={11} />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            borderLeft: "1px solid var(--border-subtle)",
            marginLeft: `${14 + depth * 12}px`,
          }}
        >
          {/* Subfolders */}
          {(folder.folders || []).map((sub) => (
            <FolderNode
              key={sub.id}
              folder={sub}
              collectionId={collectionId}
              depth={depth + 1}
              parentFolderId={folder.id}
              onOpenRequest={onOpenRequest}
            />
          ))}
          {/* Requests */}
          {(folder.requests || []).map((req) => (
            <RequestNode
              key={req.id}
              request={req}
              collectionId={collectionId}
              depth={0}
              folderId={folder.id}
              onOpen={() => onOpenRequest(req, folder.id)}
            />
          ))}
          {!hasSubs && !hasRequests && !addingRequest && !addingSubfolder && (
            <div
              className="px-3 py-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Empty folder
            </div>
          )}
          {/* Inline add request */}
          {addingRequest && (
            <div className="px-2 py-1">
              <input
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addRequest(addingRequest);
                  if (e.key === "Escape") {
                    setAddingRequest(null);
                    setNewItemName("");
                  }
                }}
                placeholder={
                  addingRequest === "websocket"
                    ? "WebSocket name…"
                    : "Request name…"
                }
                className="w-full px-2 py-1 text-xs rounded-md outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--accent)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}
          {/* Inline add subfolder */}
          {addingSubfolder && (
            <div className="px-2 py-1">
              <input
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSubfolder();
                  if (e.key === "Escape") {
                    setAddingSubfolder(false);
                    setNewItemName("");
                  }
                }}
                placeholder="Subfolder name…"
                className="w-full px-2 py-1 text-xs rounded-md outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--accent)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}
        </div>
      )}

      {ctxMenu && (
        <CtxMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
      {colorPicker && (
        <ColorPicker
          current={folder.color}
          onChange={handleColorChange}
          onClose={() => setColorPicker(null)}
          anchorRect={colorPicker}
        />
      )}
    </div>
  );
}

// ── Collection Node ───────────────────────────────────────────────────────────

function CollectionNode({ collection, onOpenRequest }) {
  const { updateCollection, removeCollection } = useCollectionStore();
  const [expanded, setExpanded] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [addingRequest, setAddingRequest] = useState(null);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [colorPicker, setColorPicker] = useState(null);
  const rowRef = useRef(null);

  function openCtx(e) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  async function handleRename(newName) {
    setRenaming(false);
    if (newName === collection.name) return;
    const updated = await collectionsApi.update(collection._id, {
      name: newName,
    });
    updateCollection(collection._id, { name: updated.name });
  }

  async function handleColorChange(color) {
    setColorPicker(null);
    const updated = await collectionsApi.update(collection._id, { color });
    updateCollection(collection._id, { color: updated.color });
  }

  async function handleDelete() {
    await collectionsApi.delete(collection._id);
    removeCollection(collection._id);
  }

  async function addRequest(type) {
    if (!newItemName.trim()) return;
    const req = {
      id: generateId(),
      name: newItemName.trim(),
      method: "GET",
      url: "",
      type: type || "http",
    };
    const updated = await collectionsApi.addRequest(collection._id, req, null);
    updateCollection(collection._id, {
      requests: updated.requests,
      folders: updated.folders,
    });
    setAddingRequest(null);
    setNewItemName("");
    setExpanded(true);
  }

  async function addFolder() {
    if (!newItemName.trim()) return;
    const folder = { id: generateId(), name: newItemName.trim() };
    const updated = await collectionsApi.addFolder(
      collection._id,
      folder,
      null,
    );
    updateCollection(collection._id, {
      folders: updated.folders,
      requests: updated.requests,
    });
    setAddingFolder(false);
    setNewItemName("");
    setExpanded(true);
  }

  const hasFolders = (collection.folders || []).length > 0;
  const hasRequests = (collection.requests || []).length > 0;
  const colColor = collection.color || "var(--accent)";

  const ctxItems = [
    {
      label: "Add HTTP Request",
      icon: Globe,
      action: () => {
        setAddingRequest("http");
        setExpanded(true);
      },
    },
    {
      label: "Add WebSocket",
      icon: Wifi,
      action: () => {
        setAddingRequest("websocket");
        setExpanded(true);
      },
    },
    {
      label: "Add Folder",
      icon: FolderPlus,
      action: () => {
        setAddingFolder(true);
        setExpanded(true);
      },
    },
    "---",
    { label: "Rename", icon: Edit2, action: () => setRenaming(true) },
    {
      label: "Change Color",
      icon: Palette,
      action: () => {
        const rect = rowRef.current?.getBoundingClientRect();
        setColorPicker(rect);
      },
    },
    "---",
    {
      label: "Delete Collection",
      icon: Trash2,
      action: handleDelete,
      danger: true,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div
        ref={rowRef}
        className="flex items-center gap-1.5 px-2 py-2 cursor-pointer group transition-colors rounded-lg mx-1"
        onClick={() => setExpanded(!expanded)}
        onContextMenu={openCtx}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-elevated)")
        }
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="shrink-0"
        >
          {expanded ? (
            <ChevronDown size={11} style={{ color: "var(--text-muted)" }} />
          ) : (
            <ChevronRight size={11} style={{ color: "var(--text-muted)" }} />
          )}
        </button>
        {expanded ? (
          <FolderOpen size={14} style={{ color: colColor }} />
        ) : (
          <Folder size={14} style={{ color: colColor }} />
        )}

        {renaming ? (
          <InlineRename
            value={collection.name}
            onSave={handleRename}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            className="flex-1 text-xs font-semibold truncate"
            style={{ color: "var(--text-primary)" }}
          >
            {collection.name}
          </span>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAddingRequest("http");
              setExpanded(true);
            }}
            className="p-0.5 rounded"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
            title="Add Request"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCtx(e);
            }}
            className="p-0.5 rounded"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && (
        <div
          className="ml-1"
          style={{
            borderLeft: "1px solid var(--border-subtle)",
            marginLeft: 16,
          }}
        >
          {/* Folders */}
          {(collection.folders || []).map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              collectionId={collection._id}
              depth={0}
              parentFolderId={null}
              onOpenRequest={onOpenRequest}
            />
          ))}
          {/* Root requests */}
          {(collection.requests || []).map((req) => (
            <RequestNode
              key={req.id}
              request={req}
              collectionId={collection._id}
              depth={0}
              folderId={null}
              onOpen={() => onOpenRequest(req, null)}
            />
          ))}
          {!hasFolders && !hasRequests && !addingRequest && !addingFolder && (
            <div
              className="px-3 py-2 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Empty collection
            </div>
          )}
          {/* Inline add request */}
          {addingRequest && (
            <div className="px-2 py-1.5">
              <input
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addRequest(addingRequest);
                  if (e.key === "Escape") {
                    setAddingRequest(null);
                    setNewItemName("");
                  }
                }}
                placeholder={
                  addingRequest === "websocket"
                    ? "WebSocket name…"
                    : "Request name…"
                }
                className="w-full px-2 py-1 text-xs rounded-md outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--accent)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}
          {/* Inline add folder */}
          {addingFolder && (
            <div className="px-2 py-1.5">
              <input
                autoFocus
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addFolder();
                  if (e.key === "Escape") {
                    setAddingFolder(false);
                    setNewItemName("");
                  }
                }}
                placeholder="Folder name…"
                className="w-full px-2 py-1 text-xs rounded-md outline-none"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--accent)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}
        </div>
      )}

      {ctxMenu && (
        <CtxMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
      {colorPicker && (
        <ColorPicker
          current={collection.color}
          onChange={handleColorChange}
          onClose={() => setColorPicker(null)}
          anchorRect={colorPicker}
        />
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function CollectionPanel() {
  const { collections, addCollection } = useCollectionStore();
  const { openOrAddTab } = useTabStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  async function createCollection() {
    if (!newName.trim()) return;
    const col = await collectionsApi.create({
      name: newName.trim(),
      color: newColor,
    });
    addCollection(col);
    setNewName("");
    setCreating(false);
  }

  function openRequest(req, folderId) {
    openOrAddTab({
      name: req.name,
      method: req.method || "GET",
      url: req.url || "",
      headers: req.headers?.length
        ? req.headers
        : [{ id: generateId(), key: "", value: "", enabled: true }],
      params: req.params?.length
        ? req.params
        : [{ id: generateId(), key: "", value: "", enabled: true }],
      bodyType: req.bodyType || "none",
      body: req.body || "",
      formFields: req.formFields?.length
        ? req.formFields
        : [
            {
              id: generateId(),
              key: "",
              value: "",
              type: "text",
              enabled: true,
            },
          ],
      auth: req.auth || { type: "none" },
      type: req.type || "http",
      collectionId: null, // will be linked if user saves again
      requestId: req.id,
      folderId: folderId,
      isDirty: false,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Collections
        </span>
        <button
          onClick={() => setCreating(!creating)}
          className="p-1 rounded-md transition-colors"
          style={{ color: "var(--accent)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--accent-subtle)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
          title="New Collection"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* New collection inline form */}
      {creating && (
        <div
          className="px-3 py-2 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createCollection();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="Collection name…"
              className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--accent)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 my-4">
            {PRESET_COLORS.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full transition-transform"
                style={{
                  background: c,
                  outline: newColor === c ? `2px solid ${c}` : "none",
                  outlineOffset: 1.5,
                  transform: newColor === c ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button
              onClick={createCollection}
              className="flex-1 py-1 text-xs rounded-md font-medium"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              className="flex-1 py-1 text-xs rounded-md"
              style={{
                background: "var(--bg-overlay)",
                color: "var(--text-muted)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {collections.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
            <Folder size={22} style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No collections yet.
              <br />
              Create one to save requests.
            </p>
          </div>
        )}
        {collections.map((col) => (
          <CollectionNode
            key={col._id}
            collection={col}
            onOpenRequest={openRequest}
          />
        ))}
      </div>
    </div>
  );
}
