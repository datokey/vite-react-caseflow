import { useState } from "react";
import KeywordTagInput from "../KeywordTagInput";
import ArticlePreview from "../editor/ArticlePreview";
import RichTextEditor from "../editor/RichTextEditor";

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
  onChangeField,
  onChangeKeywords,
  onEditorError,
  onKeywordError,
  onSubmit,
  submitLabel,
  submittingLabel = "Menyimpan...",
}) => {
  const [viewMode, setViewMode] = useState(VIEW_MODES.editor);

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
      <div className="space-y-6">
        {/* Semua field artikel dikumpulkan di komponen ini agar create dan edit punya UI yang konsisten. */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Judul Artikel</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={onChangeField}
            placeholder="Masukkan judul artikel..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            required
          />
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="block text-sm font-semibold text-slate-900">Konten Artikel</label>
            <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setViewMode(VIEW_MODES.editor)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition sm:flex-none ${
                  viewMode === VIEW_MODES.editor ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setViewMode(VIEW_MODES.preview)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition sm:flex-none ${
                  viewMode === VIEW_MODES.preview ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
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
              placeholder="Tulis konten artikel..."
            />
          ) : (
            <ArticlePreview content={formData.content} />
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Keyword</label>
          <KeywordTagInput value={formData.keywords} onChange={onChangeKeywords} onError={onKeywordError} />
        </div>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
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
