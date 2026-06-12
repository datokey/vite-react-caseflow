import TinyMCEEditor from "./editor/TinyMCEEditor";

export default function InternalInstructionEditor({
  helperText = "Bisa copy-paste dari dokumen lain; TinyMCE akan berusaha mempertahankan format asli seperti list, heading, tabel, warna, dan style teks.",
  id,
  label = "Instruksi Internal",
  onChange,
  placeholder,
  value,
}) {
  const safeValue = value || "";

  return (
    <div>
      <div className="mb-2">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
          {label}
        </label>
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      </div>

      <TinyMCEEditor
        id={id}
        value={safeValue}
        onChange={onChange}
        placeholder={placeholder}
        className="template-chat-editor internal-instruction-editor"
        height={260}
      />
    </div>
  );
}
