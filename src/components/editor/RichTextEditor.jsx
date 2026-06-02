import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import EditorToolbar from "./EditorToolbar";
import { createEditorExtensions } from "./editorExtensions";

const normalizeEditorHtml = (html) => (html === "<p></p>" ? "" : html);

const RichTextEditor = ({ value, onChange, onError, placeholder }) => {
  const editor = useEditor({
    extensions: createEditorExtensions(placeholder),
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "article-content min-h-[22rem] w-full px-4 py-4 text-slate-700 outline-none md:px-5 dark:text-slate-200",
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(normalizeEditorHtml(currentEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;

    const nextContent = value || "";
    const currentContent = normalizeEditorHtml(editor.getHTML());

    if (nextContent !== currentContent) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xs focus-within:ring-2 focus-within:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950">
      <EditorToolbar editor={editor} onImageError={onError} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
