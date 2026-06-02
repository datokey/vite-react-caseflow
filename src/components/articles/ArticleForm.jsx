import { useState } from "react";
import KeywordTagInput from "../KeywordTagInput";
import ArticlePreview from "../editor/ArticlePreview";
import RichTextEditor from "../editor/RichTextEditor";
import PenangananEditor from "./PenangananEditor";

const VIEW_MODES = {
  editor: "editor",
  preview: "preview",
};

const ArticleForm = ({
  cancelLabel = "Batal",
  formData,
  isSaving,
  onCancel,
  onChangeContent,
  onChangeDetails,
  onChangeField,
  onChangeKeywords,
  onChangeKondisi,
  onChangePenanganan,
  onEditorError,
  onKeywordError,
  onSubmit,
  submitLabel,
  submittingLabel = "Menyimpan...",
}) => {
  const [viewMode, setViewMode] = useState(VIEW_MODES.editor);

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-6">
        {/* Semua field artikel dikumpulkan di komponen ini agar create dan edit punya UI yang konsisten. */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">Judul SOP</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={onChangeField}
            placeholder="Masukkan judul SOP..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            required
          />
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">Deskripsi SOP</label>
            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setViewMode(VIEW_MODES.editor)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition sm:flex-none ${
                  viewMode === VIEW_MODES.editor ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-800 dark:text-indigo-200" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setViewMode(VIEW_MODES.preview)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition sm:flex-none ${
                  viewMode === VIEW_MODES.preview ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-800 dark:text-indigo-200" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Preview
              </button>
            </div>
          </div>

          {viewMode === VIEW_MODES.editor ? (
            <RichTextEditor
              value={formData.content}
              onChange={onChangeContent}
              onError={onEditorError}
              placeholder="Tulis deskripsi singkat SOP..."
            />
          ) : (
            <ArticlePreview content={formData.content} />
          )}
        </div>

        <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 dark:text-slate-100">Detail SOP</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">Jenis Log</label>
              <select
                value={formData.details?.JenisLog || ""}
                onChange={(e) => onChangeDetails("JenisLog", e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">Pilih jenis log...</option>
                <option value="Incident">Incident</option>
                <option value="Complaint">Complaint</option>
                <option value="Request">Request</option> 
                <option value="Inquiry">Inquiry</option> 
                <option value="Feedback">Feedback</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">Kondisi</label>
              <textarea
                value={formData.details?.Kondisi || ""}
                onChange={(event) => onChangeKondisi(event.target.value)}
                placeholder={"Masukkan kondisi (satu per baris)\nContoh:\nPelanggan marah tentang kualitas produk\nDelay pengiriman\nKesalahan dalam pesanan"}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Setiap baris akan disimpan sebagai satu item pada array Kondisi.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">Penanganan</label>
              {onChangePenanganan && (
                <PenangananEditor
                  value={formData.details?.Penanganan || []}
                  onChange={onChangePenanganan}
                />
              )}
              {!onChangePenanganan && (
                <input
                  type="text"
                  value={formData.details?.Penanganan || ""}
                  onChange={(e) => onChangeDetails("Penanganan", e.target.value)}
                  placeholder="Masukkan penanganan..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">Keyword</label>
          <KeywordTagInput value={formData.keywords} onChange={onChangeKeywords} onError={onKeywordError} />
        </div>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"></circle>
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {submittingLabel}
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ArticleForm;
