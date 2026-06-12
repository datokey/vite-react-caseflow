import { useEffect, useMemo, useRef } from "react";
import { Editor } from "@tinymce/tinymce-react";
import "tinymce";
import "tinymce/models/dom/model";
import "tinymce/themes/silver";
import "tinymce/icons/default";
import "tinymce/skins/ui/oxide/skin";
import "tinymce/skins/ui/oxide/content";
import "tinymce/skins/content/default/content";
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/code";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/table";
import "tinymce/plugins/wordcount";
import { useTheme } from "../../hooks/useTheme";
import { stripEmbeddedDataImages } from "../../lib/payloadSanitizer";

const TINYMCE_THEME_STYLE_ID = "caseflow-tinymce-theme";
const DEFAULT_PLUGINS = "advlist autolink code link lists table wordcount";
const DEFAULT_TOOLBAR =
  "undo redo | blocks | bold italic underline | forecolor backcolor | bullist numlist outdent indent | table blockquote removeformat | code";
const DEFAULT_CONTENT_STYLE = `
  html {
    background: #ffffff;
    color-scheme: light;
  }

  body {
    background: #ffffff;
    color: #0f172a;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.65;
    min-height: 100%;
  }

  body[data-mce-placeholder]::before,
  body.mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before {
    color: #64748b;
  }

  a {
    color: #2563eb;
  }

  p {
    margin: 0 0 0.75rem;
  }

  ol,
  ul {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }

  li {
    margin: 0.25rem 0;
    padding-left: 0.25rem;
  }

  blockquote {
    border-left: 4px solid #c7d2fe;
    color: #475569;
    margin: 1rem 0;
    padding-left: 1rem;
  }

  table {
    border-collapse: collapse;
    margin: 0.75rem 0;
    max-width: 100%;
  }

  td,
  th {
    border: 1px solid #cbd5e1;
    padding: 0.375rem 0.5rem;
  }

  img {
    height: auto;
    max-width: 100%;
  }
`;

const DARK_CONTENT_STYLE = `
  html {
    background: #020617;
    color-scheme: dark;
  }

  body {
    background: #020617;
    color: #e2e8f0;
  }

  body[data-mce-placeholder]::before,
  body.mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before {
    color: #94a3b8;
  }

  a {
    color: #93c5fd;
  }

  blockquote {
    border-left-color: #6366f1;
    color: #cbd5e1;
  }

  td,
  th {
    border-color: #334155;
  }
`;

const getContentStyle = (isDarkMode) =>
  isDarkMode ? `${DEFAULT_CONTENT_STYLE}\n${DARK_CONTENT_STYLE}` : DEFAULT_CONTENT_STYLE;

const applyEditorTheme = (editor, isDarkMode) => {
  const doc = editor?.getDoc?.();
  const body = editor?.getBody?.();

  if (!doc || !body) return;

  let themeStyle = doc.getElementById(TINYMCE_THEME_STYLE_ID);

  if (!themeStyle) {
    themeStyle = doc.createElement("style");
    themeStyle.id = TINYMCE_THEME_STYLE_ID;
    doc.head.appendChild(themeStyle);
  }

  themeStyle.textContent = getContentStyle(isDarkMode);
  doc.documentElement.style.backgroundColor = isDarkMode ? "#020617" : "#ffffff";
  doc.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  body.style.backgroundColor = isDarkMode ? "#020617" : "#ffffff";
  body.style.color = isDarkMode ? "#e2e8f0" : "#0f172a";
  body.style.caretColor = isDarkMode ? "#e2e8f0" : "#0f172a";
  body.dataset.theme = isDarkMode ? "dark" : "light";
};

export default function TinyMCEEditor({
  className = "",
  height = 220,
  id,
  onChange,
  onEditorReady,
  placeholder,
  plugins = DEFAULT_PLUGINS,
  setup,
  toolbar = DEFAULT_TOOLBAR,
  value,
}) {
  const { isDarkMode } = useTheme();
  const editorRef = useRef(null);
  const contentStyle = useMemo(() => getContentStyle(isDarkMode), [isDarkMode]);
  const safeValue = useMemo(() => stripEmbeddedDataImages(value || ""), [value]);

  useEffect(() => {
    applyEditorTheme(editorRef.current, isDarkMode);
  }, [isDarkMode]);

  return (
    <div className={`tiny-rich-text-editor ${className}`}>
      <Editor
        id={id}
        licenseKey="gpl"
        value={safeValue}
        onEditorChange={(content) => onChange(stripEmbeddedDataImages(content))}
        onInit={(_event, editor) => {
          editorRef.current = editor;
          applyEditorTheme(editor, isDarkMode);
          onEditorReady?.(editor);
        }}
        init={{
          block_formats: "Paragraf=p; Heading 3=h3; Heading 4=h4",
          branding: false,
          browser_spellcheck: true,
          content_css: "default",
          content_style: contentStyle,
          contextmenu: false,
          extended_valid_elements: "*[*]",
          height,
          menubar: false,
          placeholder,
          paste_as_text: false,
          paste_data_images: false,
          paste_preprocess: (_plugin, args) => {
            args.content = stripEmbeddedDataImages(args.content);
          },
          paste_merge_formats: false,
          paste_remove_styles_if_webkit: false,
          paste_webkit_styles: "all",
          plugins,
          promotion: false,
          schema: "html5",
          skin_url: "default",
          statusbar: false,
          toolbar,
          toolbar_mode: "wrap",
          setup,
        }}
      />
    </div>
  );
}
