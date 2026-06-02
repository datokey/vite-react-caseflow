import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TextareaAutosize from "react-textarea-autosize";
import KeywordTagInput from "../components/KeywordTagInput";
import { articleService } from "../services/articleService";
import { keywordService } from "../services/keywordService";
import { useToast } from "../hooks/useToast";
import { ARTICLE_ROUTES } from "../lib/articleConstants";
import { buildArticleSavePayload } from "../lib/articleUtils";

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
  const lineNumbers = Array.from(
    { length: Math.max(value.split(/\r\n|\r|\n/).length, 1) },
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
    const newText = value.slice(0, start) + variableText + value.slice(end);
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
      <label className="block text-sm font-semibold text-slate-900 mb-2">
        {label}
      </label>
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleTemplateScroll}
          placeholder={placeholder}
          rows={5}
          className="block w-full resize-y border-0 bg-transparent py-3 pl-14 pr-16 font-mono text-sm leading-6 outline-none"
        />
        <button
          type="button"
          onClick={() => onToggleVariableMenu(id)}
          className="absolute bottom-3 right-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition"
          title="Insert variable"
        >
          @var
        </button>

        {isVariableMenuOpen && (
          <div className="absolute bottom-12 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-max">
            {AVAILABLE_VARIABLES.map((variable) => (
              <button
                key={variable.name}
                type="button"
                onClick={() => insertVariable(variable.name)}
                className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded transition"
              >
                <span className="font-mono text-indigo-600">
                  {"{{"}{variable.name}{"}}"}
                </span>
                <span className="ml-2 text-slate-500">
                  ({variable.display})
                </span>
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

export default function AdminSOPPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
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

  const [showVariableMenu, setShowVariableMenu] = useState({});
  const [isSavingKeyword, setIsSavingKeyword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    setFormData((prev) => ({
      ...prev,
      keyword: keywords,
    }));

    const newKeywords = keywords.filter((keyword) => keyword.isNew);
    if (!newKeywords.length) return;

    try {
      setIsSavingKeyword(true);
      const savedKeywords = await Promise.all(
        newKeywords.map((keyword) => keywordService.createKeyword(keyword.label)),
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
      showToast("SOP berhasil disimpan!", "success");
      setFormData({
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
      setTimeout(() => navigate(ARTICLE_ROUTES.home), 1500);
    } catch (error) {
      const message = error?.message || "Gagal menyimpan SOP";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-950">Admin SOP</h1>
          <p className="mt-2 text-slate-600">Kelola panduan operasional dan SOP</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Informasi Dasar
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Judul SOP
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  placeholder="Masukkan judul SOP..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Jenis Log
                </label>
                <select
                  value={formData.jenisLog}
                  onChange={(e) => handleFieldChange("jenisLog", e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Kondisi</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Daftar Kondisi
              </label>
              <TextareaAutosize
                value={formData.kondisi}
                onChange={(e) => handleFieldChange("kondisi", e.target.value)}
                placeholder="Masukkan kondisi (satu per baris)&#10;Contoh:&#10;Pelanggan marah tentang kualitas produk&#10;Delay pengiriman&#10;Kesalahan dalam pesanan"
                minRows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">
                Setiap baris akan menjadi satu kondisi
              </p>
            </div>
          </div>

          {/* Catatan Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Catatan</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Catatan Template
              </label>
              <textarea
                value={formData.catatan}
                onChange={(e) => handleFieldChange("catatan", e.target.value)}
                placeholder={DEFAULT_CATATAN}
                rows={3}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-y text-sm"
              />
            </div>
          </div>

          {/* Keyword Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Keyword</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Kata Kunci Pencarian
              </label>
              <KeywordTagInput
                value={formData.keyword}
                onChange={handleKeywordChange}
                onError={(message) =>
                  showToast(message || "Gagal memuat suggestion keyword.", "error")
                }
              />
              <p className="mt-2 text-xs text-slate-500">
                {isSavingKeyword
                  ? "Menyimpan keyword baru..."
                  : "Pilih lebih dari satu keyword, atau tambahkan keyword baru dari hasil pencarian."}
              </p>
            </div>
          </div>

          {/* Penanganan Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
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
                  className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
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
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
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
                        placeholder="Contoh: Tahap 1: Dengarkan dan Pahami"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
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
                        placeholder="Masukkan instruksi (satu per baris)&#10;Contoh:&#10;Dengarkan keluh kesah pelanggan hingga selesai&#10;Tunjukkan empati&#10;Catat poin-poin penting"
                        minRows={3}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none text-sm"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Setiap baris akan menjadi satu instruksi
                      </p>
                    </div>

                    <TextareaWithVariables
                      id={`textarea-${step.id}-templateChat`}
                      value={step.templateChat}
                      onChange={(value) =>
                        handlePenangananChange(
                          step.id,
                          "templateChat",
                          value
                        )
                      }
                      placeholder={"Masukkan template chat (plain text)\nGunakan {{variabel}} untuk placeholder\nContoh: Saya memahami frustrasi Anda. Mari kita lihat bagaimana saya bisa membantu..."}
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() =>
                setFormData({
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
                })
              }
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition"
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
