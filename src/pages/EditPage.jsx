import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import TextareaAutosize from "react-textarea-autosize";
import GenerateRuleDraftButton from "../components/GenerateRuleDraftButton";
import InternalInstructionEditor from "../components/InternalInstructionEditor";
import KeywordTagInput from "../components/KeywordTagInput";
import TemplateChatEditor from "../components/TemplateChatEditor";
import { useEditArticle } from "../hooks/useEditArticle";
import { useToast } from "../hooks/useToast";
import { ARTICLE_MESSAGES } from "../lib/articleConstants";
import { htmlToPlainText } from "../lib/htmlUtils";
import { keywordService } from "../services/keywordService";
import { sopRuleService } from "../services/sopRuleService";

const DEFAULT_CATATAN = "Tidak ada catatan pada template ini";

const LOG_TYPES = [
  { value: "Panduan Operasional", label: "Panduan Operasional" },
  { value: "Incident", label: "Incident" },
  { value: "Complaint", label: "Complaint" },
  { value: "Request", label: "Request" },
  { value: "Inquiry", label: "Inquiry" },
  { value: "Other", label: "Lainnya" },
];

const createEmptyStep = () => ({
  id: `client-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  judulPenanganan: "",
  instruksiInternal: "",
  templateChat: "",
});

const getStepKey = (step, index) => step?._id || step?.id || `step-${index}`;

const getGeneratedRuleJson = (draftResult) => {
  const draft = draftResult?.draft || {};
  const rules = Array.isArray(draft.draftRules)
    ? draft.draftRules
    : Array.isArray(draft.sop_rules)
      ? draft.sop_rules
      : Array.isArray(draft.sopRules)
        ? draft.sopRules
        : Array.isArray(draft.rules)
          ? draft.rules
          : [];

  return JSON.stringify(rules, null, 2);
};

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
  const [showGeneratedRuleJson, setShowGeneratedRuleJson] = useState(false);
  const [generatedRuleJson, setGeneratedRuleJson] = useState("[]");
  const [isLoadingRuleJson, setIsLoadingRuleJson] = useState(false);
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const [fallbackStep] = useState(createEmptyStep);

  const penangananSteps =
    Array.isArray(formData.details?.Penanganan) && formData.details.Penanganan.length > 0
      ? formData.details.Penanganan
      : [fallbackStep];

  useEffect(() => {
    if (!id || loading || error) return undefined;

    let isActive = true;

    const loadSopRules = async () => {
      try {
        setIsLoadingRuleJson(true);
        const rules = await sopRuleService.getRulesBySopId(id);
        if (!isActive) return;
        setGeneratedRuleJson(JSON.stringify(rules, null, 2));
      } catch (ruleError) {
        if (!isActive) return;
        setGeneratedRuleJson("[]");
        showToast(ruleError?.message || "Gagal memuat JSON rule SOP dari database.", "error");
      } finally {
        if (isActive) setIsLoadingRuleJson(false);
      }
    };

    loadSopRules();

    return () => {
      isActive = false;
    };
  }, [error, id, loading, showToast]);

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

    if (!htmlToPlainText(formData.details?.Catatan || "").trim()) {
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

    if (penangananSteps.some((step) => !htmlToPlainText(step.instruksiInternal).trim())) {
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-slate-950">
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
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Edit SOP</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Perbarui panduan operasional dan SOP</p>
        </div>

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-indigo-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-indigo-300">
            {ARTICLE_MESSAGES.loadingDetail}
          </div>
        )}

        {error && !loading && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        )}

        {!loading && !error && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Informasi Dasar</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Judul SOP
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    placeholder="Masukkan judul SOP..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Jenis Log
                  </label>
                  <select
                    value={formData.details?.JenisLog || ""}
                    onChange={(event) => handleDetailsChange("JenisLog", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Kondisi</h2>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daftar Kondisi
              </label>
              <TextareaAutosize
                value={formData.details?.Kondisi || ""}
                onChange={(event) => handleDetailsChange("Kondisi", event.target.value)}
                placeholder="Masukkan kondisi (satu per baris)"
                minRows={4}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Setiap baris akan menjadi satu kondisi</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tahap Penanganan</h2>
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
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
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
                          <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Judul Penanganan
                          </label>
                          <input
                            type="text"
                            value={step.judulPenanganan || ""}
                            onChange={(event) =>
                              handlePenangananChange(index, "judulPenanganan", event.target.value)
                            }
                            placeholder="Contoh: Tahap 1: Dengarkan dan Pahami"
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                            required
                          />
                        </div>

                        <InternalInstructionEditor
                          id={`instruction-${stepKey}`}
                          value={step.instruksiInternal || ""}
                          onChange={(value) =>
                            handlePenangananChange(index, "instruksiInternal", value)
                          }
                          placeholder="Contoh:&#10;Verifikasi Data Pelanggan&#10;  Cek nama pelanggan&#10;  Cek nomor telepon"
                        />

                        <TemplateChatEditor
                          id={textareaId}
                          value={step.templateChat || ""}
                          onChange={(value) =>
                            handlePenangananChange(index, "templateChat", value)
                          }
                          placeholder="Masukkan template chat. Gunakan toolbar untuk numbering/bullet dan {{variabel}} untuk placeholder."
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

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Keyword</h2>
              <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-slate-100">
                Kata Kunci Pencarian
              </label>
              <KeywordTagInput
                value={formData.keywords || []}
                onChange={handleKeywordChange}
                onError={handleKeywordSearchError}
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {isSavingKeyword
                  ? "Menyimpan keyword baru..."
                  : "Pilih lebih dari satu keyword, atau tambahkan keyword baru dari hasil pencarian."}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Catatan</h2>
              <InternalInstructionEditor
                id="edit-catatan-template-editor"
                value={formData.details?.Catatan ?? DEFAULT_CATATAN}
                onChange={(value) => handleDetailsChange("Catatan", value)}
                placeholder={DEFAULT_CATATAN}
                label="Catatan Template"
                defaultMaxDepth={3}
                helperText="Gunakan list dan tombol indent/outdent untuk membuat catatan bertingkat hingga 3 level."
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={goToHome}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <GenerateRuleDraftButton
                disabled={isSaving || isSavingKeyword}
                onDraftGenerated={(draftResult) => setGeneratedRuleJson(getGeneratedRuleJson(draftResult))}
                onBeforeGenerate={validateForm}
                promptContext={formData}
                sopId={id}
                className="flex-1"
              />
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

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">JSON Rule SOP AI</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Menampilkan JSON <span className="font-semibold">sop_rules</span> dari database untuk SOP ini.
                    Setelah generate/import AI berhasil, isi field ini akan diperbarui dengan draft terbaru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGeneratedRuleJson((isVisible) => !isVisible)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                >
                  {showGeneratedRuleJson ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>

              {showGeneratedRuleJson && (
                <div className="mt-4">
                  {isLoadingRuleJson && (
                    <p className="mb-2 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                      Memuat rule SOP dari database...
                    </p>
                  )}
                  <textarea
                    value={generatedRuleJson}
                    onChange={(event) => setGeneratedRuleJson(event.target.value)}
                    spellCheck={false}
                    rows={14}
                    className="w-full rounded-lg border border-slate-300 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
