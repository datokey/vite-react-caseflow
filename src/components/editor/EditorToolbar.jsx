const toolbarButtonBase =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

const getToolbarButtonClass = (isActive) =>
  `${toolbarButtonBase} ${
    isActive
      ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
  }`;

const readImageAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });

const EditorToolbar = ({ editor, onImageError }) => {
  if (!editor) return null;

  const runCommand = (command) => {
    command();
    editor.commands.focus();
  };

  const setLink = () => {
    if (editor.isActive("link")) {
      runCommand(() => editor.chain().focus().unsetLink().run());
      return;
    }

    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Masukkan URL link", previousUrl);

    if (url === null) return;

    if (!url.trim()) {
      runCommand(() => editor.chain().focus().unsetLink().run());
      return;
    }

    runCommand(() => editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run());
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      // Gambar disisipkan sebagai data URL agar langsung tampil dan ikut tersimpan dalam HTML.
      const imageUrl = await readImageAsDataUrl(file);
      runCommand(() => editor.chain().focus().setImage({ src: imageUrl }).run());
    } catch {
      onImageError?.("Gagal membaca file gambar.");
    }
  };

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        title="Bold"
        onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
        className={getToolbarButtonClass(editor.isActive("bold"))}
      >
        B
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => runCommand(() => editor.chain().focus().toggleItalic().run())}
        className={getToolbarButtonClass(editor.isActive("italic"))}
      >
        I
      </button>
      <button
        type="button"
        title="Underline"
        onClick={() => runCommand(() => editor.chain().focus().toggleUnderline().run())}
        className={getToolbarButtonClass(editor.isActive("underline"))}
      >
        U
      </button>
      <button
        type="button"
        title="Heading 2"
        onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
        className={getToolbarButtonClass(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        type="button"
        title="Heading 3"
        onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
        className={getToolbarButtonClass(editor.isActive("heading", { level: 3 }))}
      >
        H3
      </button>
      <button
        type="button"
        title="Bullet list"
        onClick={() => runCommand(() => editor.chain().focus().toggleBulletList().run())}
        className={getToolbarButtonClass(editor.isActive("bulletList"))}
      >
        UL
      </button>
      <button
        type="button"
        title="Numbered list"
        onClick={() => runCommand(() => editor.chain().focus().toggleOrderedList().run())}
        className={getToolbarButtonClass(editor.isActive("orderedList"))}
      >
        OL
      </button>
      <button
        type="button"
        title="Blockquote"
        onClick={() => runCommand(() => editor.chain().focus().toggleBlockquote().run())}
        className={getToolbarButtonClass(editor.isActive("blockquote"))}
      >
        "
      </button>
      <button
        type="button"
        title="Code block"
        onClick={() => runCommand(() => editor.chain().focus().toggleCodeBlock().run())}
        className={getToolbarButtonClass(editor.isActive("codeBlock"))}
      >
        &lt;/&gt;
      </button>
      <button
        type="button"
        title="Link"
        onClick={setLink}
        className={getToolbarButtonClass(editor.isActive("link"))}
      >
        Link
      </button>
      <label className={getToolbarButtonClass(false)} title="Upload gambar">
        Image
        <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
      </label>
    </div>
  );
};

export default EditorToolbar;
