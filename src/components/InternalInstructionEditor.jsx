import { useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const LEVEL_OPTIONS = [
  {
    description: "Item utama dan satu lapis sub-instruksi.",
    label: "2 Level",
    value: 2,
  },
  {
    description: "Item utama, sub-instruksi, dan satu lapis tambahan.",
    label: "3 Level",
    value: 3,
  },
];

const INSTRUCTION_MODULES = {
  toolbar: [
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["bold", "italic", "underline"],
    ["clean"],
  ],
  keyboard: {
    bindings: {
      tab: {
        key: 9,
        handler(range, context) {
          if (context.format.list) {
            this.quill.format("indent", "+1", "user");
            return false;
          }

          return true;
        },
      },
      outdent: {
        key: 9,
        shiftKey: true,
        handler(range, context) {
          if (context.format.list) {
            this.quill.format("indent", "-1", "user");
            return false;
          }

          return true;
        },
      },
    },
  },
};

const INSTRUCTION_FORMATS = ["bold", "indent", "italic", "list", "underline"];
const INDENT_CLASS_PATTERN = /ql-indent-(\d+)/g;

const clampIndentClasses = (html, maxIndent) => {
  const currentMaxIndent = getMaxIndentFromHtml(html);

  if (currentMaxIndent <= maxIndent) return html;

  if (typeof window === "undefined" || !window.DOMParser) return html;

  const documentFragment = new window.DOMParser().parseFromString(
    `<div>${html || ""}</div>`,
    "text/html",
  );
  const rootNode = documentFragment.body.firstElementChild;

  rootNode?.querySelectorAll("[class*='ql-indent-']").forEach((node) => {
    const classNames = Array.from(node.classList);
    const indentClass = classNames.find((className) => /^ql-indent-\d+$/.test(className));

    if (!indentClass) return;

    const currentIndent = Number(indentClass.replace("ql-indent-", ""));

    if (currentIndent > maxIndent) {
      node.classList.remove(indentClass);

      if (maxIndent > 0) {
        node.classList.add(`ql-indent-${maxIndent}`);
      }
    }
  });

  return rootNode?.innerHTML || html;
};

const getMaxIndentFromHtml = (html) => {
  const matches = String(html || "").match(INDENT_CLASS_PATTERN) || [];

  return matches.reduce((maxIndent, match) => {
    const indent = Number(match.replace("ql-indent-", ""));
    return Number.isFinite(indent) ? Math.max(maxIndent, indent) : maxIndent;
  }, 0);
};

export default function InternalInstructionEditor({
  defaultMaxDepth = 2,
  helperText = "Gunakan list dan tombol indent/outdent untuk membuat sub-instruksi.",
  id,
  label = "Instruksi Internal",
  onChange,
  placeholder,
  value,
}) {
  const editorRef = useRef(null);
  const safeDefaultMaxDepth = LEVEL_OPTIONS.some((option) => option.value === defaultMaxDepth)
    ? defaultMaxDepth
    : 2;
  const [maxDepth, setMaxDepth] = useState(() =>
    getMaxIndentFromHtml(value) >= 2 ? 3 : safeDefaultMaxDepth,
  );
  const maxIndent = Math.max(maxDepth - 1, 0);
  const safeValue = value || "";
  const currentMaxIndent = useMemo(() => getMaxIndentFromHtml(safeValue), [safeValue]);
  const isAtLimit = currentMaxIndent >= maxIndent;

  const handleChange = (content) => {
    const clampedContent = clampIndentClasses(content, maxIndent);

    if (clampedContent === safeValue) return;

    onChange(clampedContent);
  };

  const handleDepthChange = (nextDepth) => {
    const nextMaxIndent = Math.max(nextDepth - 1, 0);
    setMaxDepth(nextDepth);

    const clampedContent = clampIndentClasses(safeValue, nextMaxIndent);

    if (clampedContent !== safeValue) {
      onChange(clampedContent);
    }

    editorRef.current?.getEditor?.().focus();
  };

  return (
    <div>
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <label htmlFor={id} className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
            {label}
          </label>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        </div>

        <div className="flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {LEVEL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.description}
              onClick={() => handleDepthChange(option.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                maxDepth === option.value
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ReactQuill
        id={id}
        ref={editorRef}
        theme="snow"
        value={safeValue}
        onChange={handleChange}
        modules={INSTRUCTION_MODULES}
        formats={INSTRUCTION_FORMATS}
        placeholder={placeholder}
        className="template-chat-editor internal-instruction-editor"
      />

      <p className={`mt-2 text-xs leading-5 ${
        isAtLimit ? "text-amber-600 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"
      }`}>
        Maksimal {maxDepth} level. Jika indent melebihi batas, sistem otomatis menahannya di level terakhir.
      </p>
    </div>
  );
}
