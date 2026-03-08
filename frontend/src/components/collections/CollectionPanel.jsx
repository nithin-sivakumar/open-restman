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
  Check,
  X,
} from "lucide-react";
import { useCollectionStore, useTabStore } from "../../store/index.js";
import { collectionsApi } from "../../utils/api.js";
import { generateId } from "../../utils/helpers.js";
import Portal from "../ui/Portal.jsx";

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

// ── Drag-and-Drop context ──────────────────────────────────────────────────────
// We use a module-level ref so drag state is shared across all nodes without re-renders
let dragState = null; // { type: 'request'|'folder', item, collectionId, folderId }

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

// ── Drop zone indicator ────────────────────────────────────────────────────────
function DropZone({ onDrop, label }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className="mx-2 my-0.5 px-3 py-1.5 rounded-lg border border-dashed text-[10px] text-center transition-all"
      style={{
        borderColor: over ? "var(--accent)" : "var(--border-subtle)",
        background: over ? "var(--accent-subtle)" : "transparent",
        color: over ? "var(--accent)" : "var(--text-muted)",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop();
      }}
    >
      {label || "Drop here"}
    </div>
  );
}

// ── Request Node ──────────────────────────────────────────────────────────────
function RequestNode({ request, collectionId, folderId, onOpen, onRefresh }) {
  const { updateCollection } = useCollectionStore();
  const [ctxMenu, setCtxMenu] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [dragOver, setDragOver] = useState(false);

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

  // Drag source
  function onDragStart(e) {
    dragState = { type: "request", item: request, collectionId, folderId };
    e.dataTransfer.effectAllowed = "move";
  }

  // Drop target (reorder within same container handled by parent DropZone)
  async function handleDropOnSelf(e) {
    e.preventDefault();
    setDragOver(false);
    if (!dragState || dragState.item?.id === request.id) return;
    await performDrop(collectionId, folderId, updateCollection);
  }

  const methodColor =
    request.type === "websocket"
      ? "text-emerald-400"
      : METHOD_TEXT_COLORS[request.method] || "text-zinc-400";

  const ctxItems = [
    { label: "Open", icon: Globe, action: onOpen },
    { label: "Rename", icon: Edit2, action: () => setRenaming(true) },
    { label: "Duplicate", icon: Copy, action: handleDuplicate },
    "---",
    { label: "Delete", icon: Trash2, action: handleDelete, danger: true },
  ];

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropOnSelf}
        className="flex items-center gap-1.5 rounded-lg cursor-pointer group transition-all ml-4"
        style={{
          paddingLeft: 8,
          paddingRight: 4,
          paddingTop: 5,
          paddingBottom: 5,
          background: dragOver ? "var(--accent-subtle)" : "transparent",
          outline: dragOver ? "1px dashed var(--accent)" : "none",
        }}
        onClick={onOpen}
        onContextMenu={openCtx}
        onMouseEnter={(e) => {
          if (!dragOver)
            e.currentTarget.style.background = "var(--bg-elevated)";
        }}
        onMouseLeave={(e) => {
          if (!dragOver) e.currentTarget.style.background = "transparent";
        }}
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
    </>
  );
}

// Shared drop handler — moves dragState item to target collection/folder
async function performDrop(
  targetCollectionId,
  targetFolderId,
  updateCollection,
) {
  if (!dragState) return;
  const {
    type,
    item,
    collectionId: srcColId,
    folderId: srcFolderId,
  } = dragState;
  dragState = null;

  if (type === "request") {
    // Remove from source
    const srcUpdated = await collectionsApi.deleteRequest(srcColId, item.id);
    updateCollection(srcColId, {
      requests: srcUpdated.requests,
      folders: srcUpdated.folders,
    });
    // Add to target
    const dstUpdated = await collectionsApi.addRequest(
      targetCollectionId,
      item,
      targetFolderId,
    );
    updateCollection(targetCollectionId, {
      requests: dstUpdated.requests,
      folders: dstUpdated.folders,
    });
  } else if (type === "folder") {
    // For folder moves — use saveTree approach: remove from source, add to target collection root
    const srcData = await collectionsApi.deleteFolder(srcColId, item.id);
    updateCollection(srcColId, {
      requests: srcData.requests,
      folders: srcData.folders,
    });
    // Re-add folder to target collection
    const dstData = await collectionsApi.addFolder(
      targetCollectionId,
      item,
      targetFolderId,
    );
    updateCollection(targetCollectionId, {
      requests: dstData.requests,
      folders: dstData.folders,
    });
  }
}

// ── Folder Node ───────────────────────────────────────────────────────────────
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
  const [addingRequest, setAddingRequest] = useState(null);
  const [addingSubfolder, setAddingSubfolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [colorPicker, setColorPicker] = useState(null);
  const [dragOver, setDragOver] = useState(false);
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

  // Drag source (folder)
  function onDragStart(e) {
    e.stopPropagation();
    dragState = {
      type: "folder",
      item: folder,
      collectionId,
      folderId: parentFolderId,
    };
    e.dataTransfer.effectAllowed = "move";
  }

  // Drop onto this folder = move item into it
  async function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!dragState || dragState.item?.id === folder.id) return;
    setExpanded(true);
    await performDrop(collectionId, folder.id, updateCollection);
  }

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
      <div
        ref={rowRef}
        draggable
        onDragStart={onDragStart}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={onDrop}
        className="flex items-center gap-1.5 rounded-lg cursor-pointer group transition-all"
        style={{
          paddingLeft: `${8 + depth * 12}px`,
          paddingRight: 4,
          paddingTop: 5,
          paddingBottom: 5,
          background: dragOver ? "var(--accent-subtle)" : "transparent",
          outline: dragOver ? "1px dashed var(--accent)" : "none",
        }}
        onClick={() => setExpanded(!expanded)}
        onContextMenu={openCtx}
        onMouseEnter={(e) => {
          if (!dragOver)
            e.currentTarget.style.background = "var(--bg-elevated)";
        }}
        onMouseLeave={(e) => {
          if (!dragOver) e.currentTarget.style.background = "transparent";
        }}
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

      {expanded && (
        <div
          style={{
            borderLeft: "1px solid var(--border-subtle)",
            marginLeft: `${14 + depth * 12}px`,
          }}
        >
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
          {(folder.requests || []).map((req) => (
            <RequestNode
              key={req.id}
              request={req}
              collectionId={collectionId}
              folderId={folder.id}
              onOpen={() => onOpenRequest(req, folder.id)}
            />
          ))}
          {/* Drop zone for empty folder / bottom of folder */}
          <DropZone
            label="Drop request or folder here"
            onDrop={() =>
              performDrop(collectionId, folder.id, updateCollection)
            }
          />
          {!folder.folders?.length && !folder.requests?.length && (
            <div
              className="px-3 py-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Empty folder
            </div>
          )}
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
  const [dragOver, setDragOver] = useState(false);
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

  // Drop onto collection root
  async function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (!dragState) return;
    setExpanded(true);
    await performDrop(collection._id, null, updateCollection);
  }

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
      <div
        ref={rowRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="flex items-center gap-1.5 px-2 py-2 cursor-pointer group transition-all rounded-lg mx-1"
        style={{
          background: dragOver ? "var(--accent-subtle)" : "transparent",
          outline: dragOver ? "1px dashed var(--accent)" : "none",
        }}
        onClick={() => setExpanded(!expanded)}
        onContextMenu={openCtx}
        onMouseEnter={(e) => {
          if (!dragOver)
            e.currentTarget.style.background = "var(--bg-elevated)";
        }}
        onMouseLeave={(e) => {
          if (!dragOver) e.currentTarget.style.background = "transparent";
        }}
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

      {expanded && (
        <div
          className="ml-1"
          style={{
            borderLeft: "1px solid var(--border-subtle)",
            marginLeft: 16,
          }}
        >
          {(collection.folders || []).map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              collectionId={collection._id}
              depth={0}
              parentFolderId={null}
              onOpenRequest={(req, fid) =>
                onOpenRequest(req, fid, collection._id)
              }
            />
          ))}
          {(collection.requests || []).map((req) => (
            <RequestNode
              key={req.id}
              request={req}
              collectionId={collection._id}
              folderId={null}
              onOpen={() => onOpenRequest(req, null, collection._id)}
            />
          ))}
          {/* Root-level drop zone */}
          <DropZone
            label="Drop here to move to root"
            onDrop={() => performDrop(collection._id, null, updateCollection)}
          />
          {!collection.folders?.length &&
            !collection.requests?.length &&
            !addingRequest &&
            !addingFolder && (
              <div
                className="px-3 py-2 text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                Empty collection
              </div>
            )}
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

  function openRequest(req, folderId, collectionId) {
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
      wsMessages: req.messages || [],
      collectionId: collectionId || null,
      requestId: req.id,
      folderId,
      isDirty: false,
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
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
