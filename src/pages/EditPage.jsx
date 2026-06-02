import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import TextareaAutosize from "react-textarea-autosize";
import KeywordTagInput from "../components/KeywordTagInput";
import { useEditArticle } from "../hooks/useEditArticle";
import { useToast } from "../hooks/useToast";
import { ARTICLE_MESSAGES } from "../lib/articleConstants";
import { keywordService } from "../services/keywordService";

const DEFAULT_CATATAN = "Tidak ada catatan pada template ini";

const LOG_TYPES = [
  { value: "Panduan Operasional", label: "Panduan Operasional" },
  { value: "Incident", label: "Incident" },
  { value: "Complaint", label: "Complaint" },
  { value: "Request", label: "Request" },
  { value: "Inquiry", label: "Inquiry" },
  { value: "Other", label: "Lainnya" },
];

const AVAILABLE_VARIABLES = [
  { name: "nama_pelanggan", display: "Nama Pelanggan" },
  { name: "tanggal", display: "Tanggal" },
  { name: "nomor_tiket", display: "Nomor Tiket" },
  { name: "sapaan", display: "Sapaan (Bapak/Ibu)" },
  { name: "produk", display: "Produk" },
  { name: "status", display: "Status" },
];

const createEmptyStep = () => ({
  id: `client-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  judulPenanganan: "",
  instruksiInternal: "",
  templateChat: "",
});

const getStepKey = (step, index) => step?._id || step?.id || `step-${index}`;

function TextareaWithVariables({
  id,
  value,
  onChange,
  placeholder,
  label,
  isVariableMenuOpen,
  onToggleVariableMenu,
  onCloseVariableMenu,
}) {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const safeValue = value || "";
  const lineNumbers = Array.from(
    { length: Math.max(safeValue.split(/\r\n|\r|\n/).length, 1) },
    (_, index) => index + 1,
  );

  const handleTemplateScroll = () => {
    if (!textareaRef.current || !lineNumbersRef.current) return;

    lineNumbersRef.current.style.transform = `translateY(-${textareaRef.current.scrollTop}px)`;
  };

  const insertVariable = (variable) => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const variableText = `{{${variable}}}`;
    const newText = safeValue.slice(0, start) + variableText + safeValue.slice(end);
    const newCursorPosition = start + variableText.length;

    onChange(newText);
    onCloseVariableMenu(id);

    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-semibold text-slate-900">{label}</label>
      <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:ring-2 focus-within:ring-indigo-500">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 overflow-hidden border-r border-slate-200 bg-slate-50">
          <div
            ref={lineNumbersRef}
            className="px-2 py-3 text-right font-mono text-xs leading-6 text-slate-400"
          >
            {lineNumbers.map((lineNumber) => (
              <div key={lineNumber} className="h-6">
                {lineNumber}
              </div>
            ))}
          </div>
        </div>

        <textarea
          id={id}
          ref={textareaRef}
          value={safeValue}
          onChange={(event) => onChange(event.target.value)}
          onScroll={handleTemplateScroll}
          placeholder={placeholder}
          rows={5}
          className="block w-full resize-y border-0 bg-transparent py-3 pl-14 pr-16 font-mono text-sm leading-6 outline-none"
        />

        <button
          type="button"
          onClick={() => onToggleVariableMenu(id)}
          className="absolute bottom-3 right-3 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
          title="Insert variable"
        >
          @var
        </button>

        {isVariableMenuOpen && (
          <div className="absolute bottom-12 right-0 z-10 min-w-max rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {AVAILABLE_VARIABLES.map((variable) => (
              <button
                key={variable.name}
                type="button"
                onClick={() => insertVariable(variable.name)}
                className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-indigo-50"
              >
                <span className="font-mono text-indigo-600">
                  {"{{"}{variable.name}{"}}"}
                </span>
                <span className="ml-2 text-slate-500">({variable.display})</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Klik @var untuk menambahkan variabel otomatis
      </p>
    </div>
  );
}

export default function EditPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const {
    error,
    formData,
    goToHome,
    handleContentChange,
    handleDetailsChange,
    handleInputChange,
    handleKeywordsChange,
    handleKeywordSearchError,
    handleSave,
    isSaving,
    loading,
  } = useEditArticle(id);
  const [showVariableMenu, setShowVariableMenu] = useState({});
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const [fallbackStep] = useState(createEmptyStep);

  const penangananSteps =
    Array.isArray(formData.details?.Penanganan) && formData.details.Penanganan.length > 0
      ? formData.details.Penanganan
      : [fallbackStep];

  const handleTitleChange = (value) => {
    handleInputChange({ target: { name: "title", value } });
    handleContentChange(value);
  };

  const handleKeywordChange = async (keywords) => {
    const newlyAddedKeywords = keywords.filter(
      (keyword) =>
        keyword.isNew &&
        !(formData.keywords || []).some((selectedKeyword) => selectedKeyword.value === keyword.value),
    );

    handleKeywordsChange(keywords);

    if (!newlyAddedKeywords.length) return;

    try {
      setIsSavingKeyword(true);
      const savedKeywords = await Promise.all(
        newlyAddedKeywords.map((keyword) => keywordService.createKeyword(keyword.label)),
      );

      handleKeywordsChange(
        keywords.map((keyword) => {
          const savedKeyword = savedKeywords.find((item) => item.value === keyword.value);
          return savedKeyword || keyword;
        }),
      );
    } catch (keywordError) {
      showToast(keywordError?.message || "Gagal menyimpan keyword baru.", "error");
    } finally {
      setIsSavingKeyword(false);
    }
  };

  const handlePenangananChange = (index, field, value) => {
    handleDetailsChange(
      "Penanganan",
      penangananSteps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, [field]: value } : step,
      ),
    );
  };

  const addPenangananStep = () => {
    handleDetailsChange("Penanganan", [...penangananSteps, createEmptyStep()]);
  };

  const removePenangananStep = (indexToRemove) => {
    if (penangananSteps.length === 1) {
      showToast("Minimal harus ada satu tahap penanganan.", "error");
      return;
    }

    handleDetailsChange(
      "Penanganan",
      penangananSteps.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleToggleVariableMenu = (textareaId) => {
    setShowVariableMenu((currentMenu) => ({
      ...currentMenu,
      [textareaId]: !currentMenu[textareaId],
    }));
  };

  const handleCloseVariableMenu = (textareaId) => {
    setShowVariableMenu((currentMenu) => ({
      ...currentMenu,
      [textareaId]: false,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showToast("Judul SOP harus diisi.", "error");
      return false;
    }

    if (!formData.details?.JenisLog?.trim()) {
      showToast("Jenis Log harus dipilih.", "error");
      return false;
    }

    if (!formData.details?.Kondisi?.trim()) {
      showToast("Kondisi harus diisi minimal satu.", "error");
      return false;
    }

    if (!formData.details?.Catatan?.trim()) {
      showToast("Catatan tidak boleh kosong.", "error");
      return false;
    }

    if (isSavingKeyword) {
      showToast("Tunggu sampai keyword baru selesai disimpan.", "error");
      return false;
    }

    if (penangananSteps.some((step) => !step.judulPenanganan?.trim())) {
      showToast("Semua tahap penanganan harus memiliki judul.", "error");
      return false;
    }

    if (penangananSteps.some((step) => !step.instruksiInternal?.trim())) {
      showToast("Semua tahap penanganan harus memiliki instruksi internal.", "error");
      return false;
    }

    return true;
  };

  const handleSubmit = (event) => {
    if (!validateForm()) {
      event.preventDefault();
      return;
    }

    handleSave(event);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={goToHome}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>
          <h1 className="text-3xl font-bold text-slate-950">Edit SOP</h1>
          <p className="mt-2 text-slate-600">Perbarui panduan operasional dan SOP</p>
        </div>

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-indigo-600 shadow-sm">
            {ARTICLE_MESSAGES.loadingDetail}
          </div>
        )}

        {error && !loading && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-600">
            {error}
          </div>
        )}

        {!loading && !error && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Informasi Dasar</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Judul SOP
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    placeholder="Masukkan judul SOP..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Jenis Log
                  </label>
                  <select
                    value={formData.details?.JenisLog || ""}
                    onChange={(event) => handleDetailsChange("JenisLog", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Pilih jenis log...</option>
                    {LOG_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Kondisi</h2>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                Daftar Kondisi
              </label>
              <TextareaAutosize
                value={formData.details?.Kondisi || ""}
                onChange={(event) => handleDetailsChange("Kondisi", event.target.value)}
                placeholder="Masukkan kondisi (satu per baris)"
                minRows={4}
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-2 text-xs text-slate-500">Setiap baris akan menjadi satu kondisi</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Tahap Penanganan</h2>
                <button
                  type="button"
                  onClick={addPenangananStep}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  + Tambah Tahap
                </button>
              </div>

              <div className="space-y-6">
                {penangananSteps.map((step, index) => {
                  const stepKey = getStepKey(step, index);
                  const textareaId = `edit-${stepKey}-templateChat`;

                  return (
                    <div
                      key={stepKey}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Tahap {index + 1}
                        </h3>
                        {penangananSteps.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePenangananStep(index)}
                            className="text-xs font-semibold text-rose-600 transition hover:text-rose-700"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-900">
                            Judul Penanganan
                          </label>
                          <input
                            type="text"
                            value={step.judulPenanganan || ""}
                            onChange={(event) =>
                              handlePenangananChange(index, "judulPenanganan", event.target.value)
                            }
                            placeholder="Contoh: Tahap 1: Dengarkan dan Pahami"
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-900">
                            Instruksi Internal
                          </label>
                          <TextareaAutosize
                            value={step.instruksiInternal || ""}
                            onChange={(event) =>
                              handlePenangananChange(index, "instruksiInternal", event.target.value)
                            }
                            placeholder="Masukkan instruksi (satu per baris)"
                            minRows={3}
                            className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Setiap baris akan menjadi satu instruksi
                          </p>
                        </div>

                        <TextareaWithVariables
                          id={textareaId}
                          value={step.templateChat || ""}
                          onChange={(value) =>
                            handlePenangananChange(index, "templateChat", value)
                          }
                          placeholder={
                            "Masukkan template chat (plain text)\nGunakan {{variabel}} untuk placeholder"
                          }
                          label="Template Chat"
                          isVariableMenuOpen={Boolean(showVariableMenu[textareaId])}
                          onToggleVariableMenu={handleToggleVariableMenu}
                          onCloseVariableMenu={handleCloseVariableMenu}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Keyword</h2>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                Kata Kunci Pencarian
              </label>
              <KeywordTagInput
                value={formData.keywords || []}
                onChange={handleKeywordChange}
                onError={handleKeywordSearchError}
              />
              <p className="mt-2 text-xs text-slate-500">
                {isSavingKeyword
                  ? "Menyimpan keyword baru..."
                  : "Pilih lebih dari satu keyword, atau tambahkan keyword baru dari hasil pencarian."}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Catatan</h2>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                Catatan Template
              </label>
              <textarea
                value={formData.details?.Catatan ?? DEFAULT_CATATAN}
                onChange={(event) => handleDetailsChange("Catatan", event.target.value)}
                placeholder={DEFAULT_CATATAN}
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goToHome}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving || isSavingKeyword}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {isSaving ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
