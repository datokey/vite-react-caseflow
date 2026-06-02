import { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import KeywordTagInput from "../components/KeywordTagInput";
import TemplateChatEditor from "../components/TemplateChatEditor";
import { articleService } from "../services/articleService";
import { keywordService } from "../services/keywordService";
import { useToast } from "../hooks/useToast";
import { ARTICLE_ROUTES } from "../lib/articleConstants";
import { buildArticleSavePayload } from "../lib/articleUtils";

const DEFAULT_CATATAN = "Tidak ada catatan pada template ini";
const NAVIGATION_PREFERENCE_KEY = "adminSopNavigationPreference";
const NAVIGATION_PREFERENCES = {
  stay: "stay-admin",
  home: "go-home",
};

const LOG_TYPES = [
  { value: "Panduan Operasional", label: "Panduan Operasional" },
  { value: "Incident", label: "Incident" },
  { value: "Complaint", label: "Complaint" },
  { value: "Request", label: "Request" },
  { value: "Inquiry", label: "Inquiry" },
  { value: "Other", label: "Lainnya" },
];

const getStoredNavigationPreference = () => {
  try {
    const storedPreference = window.localStorage.getItem(NAVIGATION_PREFERENCE_KEY);

    return Object.values(NAVIGATION_PREFERENCES).includes(storedPreference)
      ? storedPreference
      : NAVIGATION_PREFERENCES.stay;
  } catch {
    return NAVIGATION_PREFERENCES.stay;
  }
};

const saveNavigationPreference = (preference) => {
  try {
    window.localStorage.setItem(NAVIGATION_PREFERENCE_KEY, preference);
  } catch {
    // Preferensi hanya enhancement; submit SOP tetap berjalan jika storage dibatasi.
  }
};

const createEmptyFormData = () => ({
  title: "",
  jenisLog: "",
  kondisi: "",
  catatan: DEFAULT_CATATAN,
  keyword: [],
  penanganan: [
    {
      id: 1,
      judulPenanganan: "",
      instruksiInternal: "",
      templateChat: "",
    },
  ],
});

export default function AdminSOPPage() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState(createEmptyFormData);
  const [navigationPreference, setNavigationPreference] = useState(getStoredNavigationPreference);

  const [showVariableMenu, setShowVariableMenu] = useState({});
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleNavigationPreferenceChange = (preference) => {
    setNavigationPreference(preference);
    saveNavigationPreference(preference);
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePenangananChange = (id, field, value) => {
    setFormData((prev) => ({
      ...prev,
      penanganan: prev.penanganan.map((step) =>
        step.id === id ? { ...step, [field]: value } : step
      ),
    }));
  };

  const handleKeywordChange = async (keywords) => {
    const newlyAddedKeywords = keywords.filter(
      (keyword) =>
        keyword.isNew &&
        !formData.keyword.some((selectedKeyword) => selectedKeyword.value === keyword.value),
    );

    setFormData((prev) => ({
      ...prev,
      keyword: keywords,
    }));

    if (!newlyAddedKeywords.length) return;

    try {
      setIsSavingKeyword(true);
      const savedKeywords = await Promise.all(
        newlyAddedKeywords.map((keyword) => keywordService.createKeyword(keyword.label)),
      );

      setFormData((prev) => ({
        ...prev,
        keyword: prev.keyword.map((keyword) => {
          const savedKeyword = savedKeywords.find(
            (item) => item.value === keyword.value,
          );

          return savedKeyword || keyword;
        }),
      }));
    } catch (error) {
      showToast(error?.message || "Gagal menyimpan keyword baru.", "error");
    } finally {
      setIsSavingKeyword(false);
    }
  };

  const addPenangananStep = () => {
    const newId = Math.max(...formData.penanganan.map((s) => s.id), 0) + 1;
    setFormData((prev) => ({
      ...prev,
      penanganan: [
        ...prev.penanganan,
        {
          id: newId,
          judulPenanganan: "",
          instruksiInternal: "",
          templateChat: "",
        },
      ],
    }));
  };

  const removePenangananStep = (id) => {
    if (formData.penanganan.length === 1) {
      alert("Minimal harus ada satu tahap penanganan");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      penanganan: prev.penanganan.filter((step) => step.id !== id),
    }));
  };

  const handleToggleVariableMenu = (textareaId) => {
    setShowVariableMenu((prev) => ({
      ...prev,
      [textareaId]: !prev[textareaId],
    }));
  };

  const handleCloseVariableMenu = (textareaId) => {
    setShowVariableMenu((prev) => ({
      ...prev,
      [textareaId]: false,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      showToast("Judul SOP harus diisi", "error");
      return false;
    }
    if (!formData.jenisLog.trim()) {
      showToast("Jenis Log harus dipilih", "error");
      return false;
    }
    if (!formData.kondisi.trim()) {
      showToast("Kondisi harus diisi minimal satu", "error");
      return false;
    }
    if (!formData.catatan.trim()) {
      showToast("Catatan tidak boleh kosong", "error");
      return false;
    }
    if (isSavingKeyword) {
      showToast("Tunggu sampai keyword baru selesai disimpan.", "error");
      return false;
    }
    if (formData.penanganan.some((p) => !p.judulPenanganan.trim())) {
      showToast("Semua tahap penanganan harus memiliki judul", "error");
      return false;
    }
    if (formData.penanganan.some((p) => !p.instruksiInternal.trim())) {
      showToast("Semua tahap penanganan harus memiliki instruksi internal", "error");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setIsSaving(false);
      return;
    }

    setIsSaving(true);

    let savedKeywords;

    try {
      savedKeywords = await keywordService.persistKeywords(formData.keyword);
    } catch (error) {
      setIsSaving(false);
      showToast(error?.message || "Gagal menyimpan keyword.", "error");
      return;
    }

    const payload = buildArticleSavePayload({
      title: formData.title,
      content: formData.title,
      keywords: savedKeywords,
      details: {
        JenisLog: formData.jenisLog,
        Kondisi: formData.kondisi,
        Catatan: formData.catatan,
        Penanganan: formData.penanganan.map((step) => ({
          judulPenanganan: step.judulPenanganan,
          instruksiInternal: step.instruksiInternal,
          templateChat: step.templateChat,
        })),
      },
    });

    try {
      await articleService.createArticle(payload);
      saveNavigationPreference(navigationPreference);
      showToast("SOP berhasil disimpan!", "success");
      setFormData(createEmptyFormData());

      if (navigationPreference === NAVIGATION_PREFERENCES.home) {
        window.setTimeout(() => {
          window.location.href = ARTICLE_ROUTES.home;
        }, 600);
      }
    } catch (error) {
      const message = error?.message || "Gagal menyimpan SOP";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Admin SOP</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Kelola panduan operasional dan SOP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">
              Informasi Dasar
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">
                  Judul SOP
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  placeholder="Masukkan judul SOP..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">
                  Jenis Log
                </label>
                <select
                  value={formData.jenisLog}
                  onChange={(e) => handleFieldChange("jenisLog", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition dark:border-slate-700 dark:bg-slate-950 dark:text-white"
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

          {/* Kondisi Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Kondisi</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">
                Daftar Kondisi
              </label>
              <TextareaAutosize
                value={formData.kondisi}
                onChange={(e) => handleFieldChange("kondisi", e.target.value)}
                placeholder="Masukkan kondisi (satu per baris)&#10;Contoh:&#10;Pengguna menanyakan kegunaan atau fungsi Privy&#10;Pengguna menanyakan manfaat Privy&#10;Pengguna meminta faktur pajak untuk akun personal"
                minRows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Setiap baris akan menjadi satu kondisi
              </p>
            </div>
          </div>

          {/* Penanganan Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Tahap Penanganan
              </h2>
              <button
                type="button"
                onClick={addPenangananStep}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
              >
                + Tambah Tahap
              </button>
            </div>

            <div className="space-y-6">
              {formData.penanganan.map((step, index) => (
                <div
                  key={step.id}
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Tahap {index + 1}
                    </h3>
                    {formData.penanganan.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePenangananStep(step.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">
                        Judul Penanganan
                      </label>
                      <input
                        type="text"
                        value={step.judulPenanganan}
                        onChange={(e) =>
                          handlePenangananChange(
                            step.id,
                            "judulPenanganan",
                            e.target.value
                          )
                        }
                        placeholder="Contoh: Tahap 1: Privy itu perusahaan apa?"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">
                        Instruksi Internal
                      </label>
                      <TextareaAutosize
                        value={step.instruksiInternal}
                        onChange={(e) =>
                          handlePenangananChange(
                            step.id,
                            "instruksiInternal",
                            e.target.value
                          )
                        }
                        placeholder="Masukkan instruksi (satu per baris)&#10;Contoh:&#10; Kegunaan dan fungsi Privy&#10;Manfaat Privy &#10;Pengguna meminta faktur pajak untuk akun person
 "
                        minRows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Setiap baris akan menjadi satu instruksi
                      </p>
                    </div>

                    <TemplateChatEditor
                      id={`textarea-${step.id}-templateChat`}
                      value={step.templateChat}
                      onChange={(value) =>
                        handlePenangananChange(
                          step.id,
                          "templateChat",
                          value
                        )
                      }
                      placeholder="Masukkan template chat. Gunakan toolbar untuk numbering/bullet dan {{variabel}} untuk placeholder."
                      label="Template Chat"
                      isVariableMenuOpen={Boolean(showVariableMenu[`textarea-${step.id}-templateChat`])}
                      onToggleVariableMenu={handleToggleVariableMenu}
                      onCloseVariableMenu={handleCloseVariableMenu}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keyword Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Keyword</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">
                Kata Kunci Pencarian
              </label>
              <KeywordTagInput
                value={formData.keyword}
                onChange={handleKeywordChange}
                onError={(message) =>
                  showToast(message || "Gagal memuat suggestion keyword.", "error")
                }
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {isSavingKeyword
                  ? "Menyimpan keyword baru..."
                  : "Pilih lebih dari satu keyword, atau tambahkan keyword baru dari hasil pencarian."}
              </p>
            </div>
          </div>

          {/* Catatan Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">Catatan</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2 dark:text-slate-100">
                Catatan Template
              </label>
              <textarea
                value={formData.catatan}
                onChange={(e) => handleFieldChange("catatan", e.target.value)}
                placeholder={DEFAULT_CATATAN}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Navigation Preference Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 dark:text-white">
              Setelah SOP Berhasil Disimpan
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  navigationPreference === NAVIGATION_PREFERENCES.stay
                    ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="navigationPreference"
                    value={NAVIGATION_PREFERENCES.stay}
                    checked={navigationPreference === NAVIGATION_PREFERENCES.stay}
                    onChange={(event) => handleNavigationPreferenceChange(event.target.value)}
                    className="mt-1 h-4 w-4 accent-indigo-600"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Tetap di halaman Admin SOP
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Form tetap berada di halaman ini setelah SOP berhasil dibuat.
                    </p>
                  </div>
                </div>
              </label>

              <label
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  navigationPreference === NAVIGATION_PREFERENCES.home
                    ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:ring-indigo-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="navigationPreference"
                    value={NAVIGATION_PREFERENCES.home}
                    checked={navigationPreference === NAVIGATION_PREFERENCES.home}
                    onChange={(event) => handleNavigationPreferenceChange(event.target.value)}
                    className="mt-1 h-4 w-4 accent-indigo-600"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Beralih ke Halaman Utama
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      Aplikasi membuka ulang halaman utama agar data SOP terbaru langsung dimuat.
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormData(createEmptyFormData())}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSaving || isSavingKeyword}
              className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
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
                    ></circle>
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Menyimpan...
                </>
              ) : (
                "Simpan SOP"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
