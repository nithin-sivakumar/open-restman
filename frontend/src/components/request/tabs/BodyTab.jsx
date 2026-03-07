import { useState, useRef } from "react";
import { Plus, Trash2, Upload, X, FileText } from "lucide-react";
import { useTabStore } from "../../../store/index.js";
import { generateId } from "../../../utils/helpers.js";
import Editor from "@monaco-editor/react";
import { useThemeStore } from "../../../store/index.js";
import { BUILT_IN_THEMES } from "../../../themes/index.js";

const BODY_TYPES = [
  { id: "none", label: "None" },
  { id: "json", label: "JSON" },
  { id: "text", label: "Text" },
  { id: "xml", label: "XML" },
  { id: "formdata", label: "Form Data" },
  { id: "urlencoded", label: "URL Encoded" },
  { id: "binary", label: "Binary" },
];

export default function BodyTab({ tab }) {
  const { updateTab } = useTabStore();
  const { currentThemeId, customThemes } = useThemeStore();
  const fileRef = useRef(null);
  const [binaryFile, setBinaryFile] = useState(null);

  const allThemes = [...BUILT_IN_THEMES, ...customThemes];
  const currentTheme = allThemes.find((t) => t.id === currentThemeId);
  const monacoTheme =
    currentTheme?.category === "light" ? "vs-light" : "vs-dark";

  const bodyType = tab?.bodyType || "none";
  const formFields = tab?.formFields || [
    { id: generateId(), key: "", value: "", type: "text", enabled: true },
  ];

  function setBodyType(type) {
    updateTab(tab.id, { bodyType: type });
  }

  function updateFormField(id, updates) {
    const updated = formFields.map((f) =>
      f.id === id ? { ...f, ...updates } : f,
    );
    const last = updated[updated.length - 1];
    if (last?.key)
      updated.push({
        id: generateId(),
        key: "",
        value: "",
        type: "text",
        enabled: true,
      });
    updateTab(tab.id, { formFields: updated });
  }

  function deleteFormField(id) {
    const updated = formFields.filter((f) => f.id !== id);
    if (!updated.length)
      updated.push({
        id: generateId(),
        key: "",
        value: "",
        type: "text",
        enabled: true,
      });
    updateTab(tab.id, { formFields: updated });
  }

  function addFormField() {
    updateTab(tab.id, {
      formFields: [
        ...formFields,
        { id: generateId(), key: "", value: "", type: "text", enabled: true },
      ],
    });
  }

  const editorLang =
    { json: "json", text: "plaintext", xml: "xml" }[bodyType] || "plaintext";

  return (
    <div className="flex flex-col h-full">
      {/* Body type selector */}
      <div
        className="flex items-center gap-0.5 px-3 py-2 shrink-0 overflow-x-auto scrollbar-none"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {BODY_TYPES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setBodyType(id)}
            className="text-xs px-3 py-1 rounded-full shrink-0 transition-colors font-medium"
            style={{
              background: bodyType === id ? "var(--accent)" : "transparent",
              color: bodyType === id ? "white" : "var(--text-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {bodyType === "none" && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              No body — select a body type above
            </p>
          </div>
        )}

        {(bodyType === "json" || bodyType === "text" || bodyType === "xml") && (
          <div className="h-full">
            <Editor
              height="100%"
              language={editorLang}
              value={tab?.body || ""}
              onChange={(v) => updateTab(tab.id, { body: v || "" })}
              theme={monacoTheme}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                padding: { top: 8, bottom: 8 },
                scrollbar: {
                  verticalScrollbarSize: 4,
                  horizontalScrollbarSize: 4,
                },
              }}
            />
          </div>
        )}

        {bodyType === "formdata" && (
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Form Fields
              </span>
              <button
                onClick={addFormField}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-(--bg-overlay) transition-colors"
                style={{ color: "var(--accent)" }}
              >
                <Plus size={11} /> Add
              </button>
            </div>
            {formFields.map((field) => (
              <div key={field.id} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={field.enabled}
                  onChange={(e) =>
                    updateFormField(field.id, { enabled: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-(--accent)"
                />
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) =>
                    updateFormField(field.id, { key: e.target.value })
                  }
                  placeholder="Key"
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                {field.type === "file" ? (
                  <div className="flex-1 flex items-center gap-2">
                    <label
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md cursor-pointer transition-colors"
                      style={{
                        background: "var(--bg-input)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <Upload size={11} />
                      {field.fileName || "Choose file"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file)
                            updateFormField(field.id, {
                              value: file,
                              fileName: file.name,
                            });
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) =>
                      updateFormField(field.id, { value: e.target.value })
                    }
                    placeholder="Value"
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none"
                    style={{
                      background: "var(--bg-input)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                )}
                <button
                  onClick={() =>
                    updateFormField(field.id, {
                      type: field.type === "file" ? "text" : "file",
                    })
                  }
                  className="text-[10px] px-1.5 py-1 rounded transition-colors"
                  style={{
                    background:
                      field.type === "file"
                        ? "var(--accent-subtle)"
                        : "var(--bg-overlay)",
                    color:
                      field.type === "file"
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                  title="Toggle file upload"
                >
                  {field.type === "file" ? (
                    <FileText size={10} />
                  ) : (
                    <Upload size={10} />
                  )}
                </button>
                <button
                  onClick={() => deleteFormField(field.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/15"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {bodyType === "urlencoded" && (
          <div className="p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                URL Encoded Fields
              </span>
              <button
                onClick={addFormField}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md hover:bg-(--bg-overlay) transition-colors"
                style={{ color: "var(--accent)" }}
              >
                <Plus size={11} /> Add
              </button>
            </div>
            {formFields.map((field) => (
              <div key={field.id} className="flex items-center gap-2 group">
                <input
                  type="checkbox"
                  checked={field.enabled}
                  onChange={(e) =>
                    updateFormField(field.id, { enabled: e.target.checked })
                  }
                  className="w-3.5 h-3.5 accent-(--accent)"
                />
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) =>
                    updateFormField(field.id, { key: e.target.value })
                  }
                  placeholder="Key"
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) =>
                    updateFormField(field.id, { value: e.target.value })
                  }
                  placeholder="Value"
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-md outline-none"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  onClick={() => deleteFormField(field.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/15"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {bodyType === "binary" && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-(--accent)"
              style={{ borderColor: "var(--border)" }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload
                size={24}
                className="mx-auto mb-2"
                style={{ color: "var(--text-muted)" }}
              />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                {binaryFile ? binaryFile.name : "Click to select a file"}
              </p>
              {binaryFile && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {(binaryFile.size / 1024).toFixed(1)} KB
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setBinaryFile(file);
                    updateTab(tab.id, { binaryFile: file });
                  }
                }}
              />
            </div>
            {binaryFile && (
              <button
                onClick={() => {
                  setBinaryFile(null);
                  updateTab(tab.id, { binaryFile: null });
                }}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                style={{
                  background: "var(--bg-overlay)",
                  color: "var(--text-muted)",
                }}
              >
                <X size={11} /> Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
