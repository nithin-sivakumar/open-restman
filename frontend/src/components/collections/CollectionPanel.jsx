import { useState } from "react";
import {
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit2,
  Save,
  Globe2,
  Wifi,
} from "lucide-react";
import { useCollectionStore, useTabStore } from "../../store/index.js";
import { collectionsApi } from "../../utils/api.js";
import { getMethodBg, generateId } from "../../utils/helpers.js";

export default function CollectionPanel() {
  const { collections, addCollection, updateCollection, removeCollection } =
    useCollectionStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [expandedCollections, setExpandedCollections] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});

  async function createCollection() {
    if (!newName.trim()) return;
    const col = await collectionsApi.create({
      name: newName.trim(),
      requests: [],
      folders: [],
    });
    addCollection(col);
    setNewName("");
    setCreating(false);
  }

  async function deleteCollection(id) {
    await collectionsApi.delete(id);
    removeCollection(id);
  }

  function toggleCollection(id) {
    setExpandedCollections((s) => ({ ...s, [id]: !s[id] }));
  }

  function toggleFolder(id) {
    setExpandedFolders((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          Collections
        </span>
        <button
          onClick={() => setCreating(!creating)}
          className="p-1 rounded-md transition-colors hover:bg-(--bg-overlay)"
          style={{ color: "var(--accent)" }}
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
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createCollection();
              if (e.key === "Escape") {
                setCreating(false);
                setNewName("");
              }
            }}
            placeholder="Collection name..."
            className="w-full px-2.5 py-1.5 text-xs rounded-md outline-none"
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--accent)",
              color: "var(--text-primary)",
            }}
          />
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={createCollection}
              className="flex-1 py-1 text-xs rounded-md font-medium transition-colors"
              style={{ background: "var(--accent)", color: "white" }}
            >
              Create
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewName("");
              }}
              className="flex-1 py-1 text-xs rounded-md font-medium transition-colors"
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

      {/* Collection list */}
      <div className="flex-1 overflow-y-auto">
        {collections.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 text-center">
            <Folder size={20} style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No collections yet. Create one to save requests.
            </p>
          </div>
        )}

        {collections.map((col) => (
          <CollectionNode
            key={col._id}
            collection={col}
            expanded={expandedCollections[col._id]}
            onToggle={() => toggleCollection(col._id)}
            onDelete={() => deleteCollection(col._id)}
            onUpdate={(updates) => updateCollection(col._id, updates)}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
          />
        ))}
      </div>
    </div>
  );
}

function CollectionNode({
  collection,
  expanded,
  onToggle,
  onDelete,
  onUpdate,
  expandedFolders,
  onToggleFolder,
}) {
  const { addTab } = useTabStore();
  const [showMenu, setShowMenu] = useState(false);
  const [addingRequest, setAddingRequest] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [addingWS, setAddingWS] = useState(false);

  async function addRequest(type = "http") {
    if (!newItemName.trim()) return;
    const req = {
      id: generateId(),
      name: newItemName.trim(),
      method: "GET",
      url: "",
      type,
    };
    const updated = await collectionsApi.addRequest(collection._id, req);
    onUpdate({ requests: updated.requests, folders: updated.folders });
    setNewItemName("");
    setAddingRequest(false);
    setAddingWS(false);
  }

  async function addFolder() {
    if (!newItemName.trim()) return;
    const updated = await collectionsApi.addFolder(collection._id, {
      name: newItemName.trim(),
    });
    onUpdate({ requests: updated.requests, folders: updated.folders });
    setNewItemName("");
    setAddingFolder(false);
  }

  function openRequest(req) {
    addTab({
      name: req.name,
      method: req.method || "GET",
      url: req.url || "",
      headers: req.headers || [
        { id: generateId(), key: "", value: "", enabled: true },
      ],
      params: req.params || [
        { id: generateId(), key: "", value: "", enabled: true },
      ],
      bodyType: req.bodyType || "none",
      body: req.body || "",
      formFields: req.formFields || [],
      auth: req.auth || { type: "none" },
      type: req.type || "http",
    });
  }

  return (
    <div>
      {/* Collection header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group hover:bg-(--bg-elevated) transition-colors"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown size={12} style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
        )}
        {expanded ? (
          <FolderOpen size={13} style={{ color: "var(--accent)" }} />
        ) : (
          <Folder size={13} style={{ color: "var(--accent)" }} />
        )}
        <span
          className="flex-1 text-xs font-medium truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {collection.name}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAddingRequest(true);
              setAddingWS(false);
            }}
            className="p-1 rounded hover:bg-(--bg-overlay)"
            style={{ color: "var(--text-muted)" }}
            title="Add Request"
          >
            <Plus size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-(--bg-overlay)"
            style={{ color: "var(--text-muted)" }}
          >
            <MoreHorizontal size={11} />
          </button>
        </div>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div
          className="mx-2 mb-1 rounded-lg overflow-hidden shadow-lg z-50"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          {[
            {
              label: "Add HTTP Request",
              icon: Globe2,
              action: () => {
                setAddingRequest(true);
                setShowMenu(false);
              },
            },
            {
              label: "Add WebSocket",
              icon: Wifi,
              action: () => {
                setAddingWS(true);
                setAddingRequest(true);
                setShowMenu(false);
              },
            },
            {
              label: "Add Folder",
              icon: Folder,
              action: () => {
                setAddingFolder(true);
                setShowMenu(false);
              },
            },
            {
              label: "Delete Collection",
              icon: Trash2,
              action: () => {
                onDelete();
                setShowMenu(false);
              },
              danger: true,
            },
          ].map(({ label, icon: Icon, action, danger }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-(--bg-overlay)"
              style={{
                color: danger ? "var(--error)" : "var(--text-secondary)",
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Add request/folder input */}
      {(addingRequest || addingFolder) && (
        <div
          className="px-3 py-1.5 ml-4"
          style={{ borderLeft: "1px solid var(--border)" }}
        >
          <input
            autoFocus
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                addingFolder
                  ? addFolder()
                  : addRequest(addingWS ? "websocket" : "http");
              if (e.key === "Escape") {
                setAddingRequest(false);
                setAddingFolder(false);
                setNewItemName("");
              }
            }}
            placeholder={
              addingFolder
                ? "Folder name..."
                : addingWS
                  ? "WebSocket name..."
                  : "Request name..."
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

      {/* Expanded content */}
      {expanded && (
        <div
          className="ml-4"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          {/* Folders */}
          {(collection.folders || []).map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              expanded={expandedFolders[folder.id]}
              onToggle={() => onToggleFolder(folder.id)}
              onOpenRequest={openRequest}
            />
          ))}

          {/* Requests */}
          {(collection.requests || []).map((req) => (
            <RequestNode
              key={req.id}
              request={req}
              onOpen={() => openRequest(req)}
            />
          ))}

          {(collection.requests || []).length === 0 &&
            (collection.folders || []).length === 0 && (
              <div
                className="px-3 py-2 text-[10px]"
                style={{ color: "var(--text-muted)" }}
              >
                Empty collection
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function FolderNode({ folder, expanded, onToggle, onOpenRequest }) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-(--bg-elevated) transition-colors"
        onClick={onToggle}
      >
        {expanded ? (
          <ChevronDown size={11} style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronRight size={11} style={{ color: "var(--text-muted)" }} />
        )}
        {expanded ? (
          <FolderOpen size={12} style={{ color: "var(--warning)" }} />
        ) : (
          <Folder size={12} style={{ color: "var(--warning)" }} />
        )}
        <span
          className="text-xs truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {folder.name}
        </span>
      </div>
      {expanded && (
        <div
          className="ml-3"
          style={{ borderLeft: "1px solid var(--border-subtle)" }}
        >
          {(folder.requests || []).map((req) => (
            <RequestNode
              key={req.id}
              request={req}
              onOpen={() => onOpenRequest(req)}
            />
          ))}
          {(folder.requests || []).length === 0 && (
            <div
              className="px-3 py-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Empty folder
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestNode({ request, onOpen }) {
  const methodColors = {
    GET: "text-emerald-400",
    POST: "text-blue-400",
    PUT: "text-amber-400",
    PATCH: "text-purple-400",
    DELETE: "text-red-400",
    HEAD: "text-cyan-400",
    OPTIONS: "text-pink-400",
  };

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-(--bg-elevated) transition-colors group"
    >
      {request.type === "websocket" ? (
        <span className="text-[9px] font-bold shrink-0 text-emerald-400">
          WS
        </span>
      ) : (
        <span
          className={`text-[9px] font-bold shrink-0 ${methodColors[request.method] || "text-(--text-muted)"}`}
        >
          {request.method || "GET"}
        </span>
      )}
      <span
        className="text-xs truncate flex-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {request.name}
      </span>
    </div>
  );
}
