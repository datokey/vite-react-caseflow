import { useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const AVAILABLE_VARIABLES = [
  { name: "nama_pelanggan", display: "Nama Pelanggan" },
  { name: "tanggal", display: "Tanggal" },
  { name: "nomor_tiket", display: "Nomor Tiket" },
  { name: "sapaan", display: "Sapaan (Bapak/Ibu)" },
  { name: "produk", display: "Produk" },
  { name: "status", display: "Status" },
];

const QUILL_MODULES = {
  toolbar: [
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "clean"],
  ],
};

const QUILL_FORMATS = [
  "bold",
  "blockquote",
  "italic",
  "list",
  "underline",
];

export default function TemplateChatEditor({
  enableVariables = true,
  helperText,
  id,
  value,
  onChange,
  placeholder,
  label,
  isVariableMenuOpen,
  onToggleVariableMenu,
  onCloseVariableMenu,
}) {
  const editorRef = useRef(null);
  const safeValue = value || "";

  const insertVariable = (variable) => {
    const editor = editorRef.current?.getEditor?.();
    const variableText = `{{${variable}}}`;

    if (!editor) {
      onChange(`${safeValue}${variableText}`);
      onCloseVariableMenu(id);
      return;
    }

    editor.focus();

    const range = editor.getSelection(true);
    const insertIndex = range?.index ?? Math.max(editor.getLength() - 1, 0);

    editor.insertText(insertIndex, variableText, "user");
    editor.setSelection(insertIndex + variableText.length, 0, "silent");
    onCloseVariableMenu(id);
  };

  return (
    <div>
      <div className="relative mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
          {label}
        </label>

        {enableVariables && (
          <button
            type="button"
            onClick={() => onToggleVariableMenu(id)}
            className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Insert variable"
          >
            @var
          </button>
        )}

        {enableVariables && isVariableMenuOpen && (
          <div className="absolute right-0 top-full z-20 mt-2 min-w-max rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            {AVAILABLE_VARIABLES.map((variable) => (
              <button
                key={variable.name}
                type="button"
                onClick={() => insertVariable(variable.name)}
                className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-indigo-500/15"
              >
                <span className="font-mono text-indigo-600 dark:text-indigo-300">
                  {"{{"}{variable.name}{"}}"}
                </span>
                <span className="ml-2 text-slate-500 dark:text-slate-400">
                  ({variable.display})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ReactQuill
        id={id}
        ref={editorRef}
        theme="snow"
        value={safeValue}
        onChange={onChange}
        modules={QUILL_MODULES}
        formats={QUILL_FORMATS}
        placeholder={placeholder}
        className="template-chat-editor"
      />

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {helperText ||
          (enableVariables
            ? "Gunakan toolbar untuk numbering, bullet, bold, italic, atau klik @var untuk placeholder."
            : "Gunakan toolbar untuk numbering, bullet, bold, italic, atau format paragraf lainnya.")}
      </p>
    </div>
  );
}
