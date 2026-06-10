import { useEffect, useState } from "react";
import SanitizedHtmlRenderer from "./SanitizedHtmlRenderer";
import { useToast } from "../hooks/useToast";
import { hasHtmlMarkup, htmlToPlainText } from "../lib/htmlUtils";
import { decisionService } from "../services/decisionService";

const INITIAL_ANSWERS = {
  logType: "",
  category: "",
  subCategory: "",
  facts: {},
};

const LOG_TYPE_OPTIONS = [
  { label: "Inquiry", value: "Inquiry" },
  { label: "Request", value: "Request" },
  { label: "Complaint", value: "Complaint" },
];

const FLAG_LABELS = {
  needEscalation: "Perlu Eskalasi",
  needEvidence: "Perlu Evidence",
  needJira: "Perlu Jira",
  needVerification: "Perlu Verifikasi",
};

const toText = (value) => {
  if (value && typeof value === "object" && "$oid" in value) return String(value.$oid || "").trim();
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const formatLabel = (value) =>
  toText(value)
    .replace(/[_-]+/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());

const getSopId = (sop) => toText(sop?._id) || toText(sop?.id) || toText(sop?.sopId);

const getHandlingId = (handling) =>
  toText(handling?._id) ||
  toText(handling?.id) ||
  toText(handling?.handlingId) ||
  toText(handling?.idPenanganan);

const getQuestionField = (question) =>
  toText(question?.field) ||
  toText(question?.name) ||
  toText(question?.key) ||
  toText(question?.question).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : [])
    .map((option) => {
      if (typeof option === "string") return { label: option, value: option };
      const label =
        toText(option?.label) ||
        toText(option?.name) ||
        toText(option?.title) ||
        toText(option?.category) ||
        toText(option?.subCategory) ||
        toText(option?.caseName) ||
        toText(option?.value) ||
        toText(option?.key) ||
        toText(option?._id);
      const value =
        toText(option?.value) ||
        toText(option?.key) ||
        toText(option?.slug) ||
        toText(option?.category) ||
        toText(option?.subCategory) ||
        toText(option?.id) ||
        toText(option?._id) ||
        label;

      return {
        label,
        value,
      };
    })
    .filter((option) => option.label && option.value);

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map((item) => toText(item)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\r?\n|;|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const getDecisionSop = (decision) => decision?.sop || decision?.templateSop || decision?.article || {};
const getDecisionSopId = (decision) =>
  getSopId(getDecisionSop(decision)) || toText(decision?.sopId) || toText(decision?.idSop);
const getDecisionHandling = (decision) => decision?.handling || decision?.penanganan || {};
const getDecisionHandlingId = (decision) =>
  getHandlingId(getDecisionHandling(decision)) || toText(decision?.handlingId) || toText(decision?.penangananId);

const getArticleHandlingItems = (article) => {
  const handlingItems =
    article?.details?.Penanganan ||
    article?.details?.penanganan ||
    article?.details?.handling ||
    article?.Penanganan ||
    article?.penanganan ||
    article?.handling ||
    [];

  return Array.isArray(handlingItems) ? handlingItems : [];
};

const normalizeHandling = (handling = {}) => ({
  id: getHandlingId(handling),
  instructions:
    handling?.instruksiInternal ??
    handling?.instructions ??
    handling?.instruction ??
    handling?.internalInstruction ??
    handling?.instruksi ??
    "",
  templateChat: toText(handling?.templateChat) || toText(handling?.template) || toText(handling?.chatTemplate),
  title:
    toText(handling?.judulPenanganan) ||
    toText(handling?.title) ||
    toText(handling?.name) ||
    "Penanganan spesifik",
});

const resolveDecisionData = (decision, articles) => {
  const sopId = getDecisionSopId(decision);
  const handlingId = getDecisionHandlingId(decision);
  const sopFromResponse = getDecisionSop(decision);
  const matchedArticle = articles.find((article) => getSopId(article) === sopId);
  const articleHandling = getArticleHandlingItems(matchedArticle).find(
    (handling) => getHandlingId(handling) === handlingId,
  );
  const handling = normalizeHandling({
    ...articleHandling,
    ...getDecisionHandling(decision),
  });

  return {
    flags: decision?.flags && typeof decision.flags === "object" ? decision.flags : {},
    handling,
    handlingId,
    requiredData: normalizeList(decision?.requiredData),
    ruleName: toText(decision?.ruleName) || toText(decision?.rule) || "Rule decision",
    sopId,
    sopTitle:
      toText(sopFromResponse?.title) ||
      toText(matchedArticle?.title) ||
      toText(decision?.sopTitle) ||
      "SOP terkait",
  };
};

function ChoiceGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
              isSelected
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-200"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function QuestionRenderer({ answers, onChange, questions }) {
  if (!questions.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        Belum ada pertanyaan tambahan untuk kategori ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => {
        const field = getQuestionField(question);
        const inputType = toText(question?.inputType || question?.type || "text").toLowerCase();
        const options = normalizeOptions(question?.options || question?.choices);
        const value = answers.facts[field] ?? (inputType === "checkbox" ? [] : "");

        return (
          <fieldset
            key={field}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <legend className="px-1 text-sm font-black text-slate-900 dark:text-white">
              {toText(question?.question) || formatLabel(field)}
            </legend>

            {inputType === "radio" && options.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {options.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <input
                      type="radio"
                      checked={value === option.value}
                      onChange={() => onChange(field, option.value)}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            ) : inputType === "checkbox" && options.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {options.map((option) => {
                  const selectedValues = Array.isArray(value) ? value : [];
                  const isChecked = selectedValues.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          onChange(
                            field,
                            isChecked
                              ? selectedValues.filter((item) => item !== option.value)
                              : [...selectedValues, option.value],
                          )
                        }
                        className="h-4 w-4 rounded accent-indigo-600"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            ) : inputType === "select" && options.length > 0 ? (
              <select
                value={value}
                onChange={(event) => onChange(field, event.target.value)}
                className="mt-3 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
              >
                <option value="">Pilih jawaban</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : inputType === "textarea" ? (
              <textarea
                value={value}
                onChange={(event) => onChange(field, event.target.value)}
                rows={3}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
              />
            ) : (
              <input
                type={inputType === "number" ? "number" : "text"}
                value={value}
                onChange={(event) => onChange(field, event.target.value)}
                className="mt-3 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
              />
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

function RichContent({ content }) {
  if (!content || (Array.isArray(content) && content.length === 0)) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada konten.</p>;
  }

  if (Array.isArray(content)) {
    if (content.some((item) => hasHtmlMarkup(item))) {
      return (
        <div className="min-w-0 max-w-full space-y-3 overflow-x-auto">
          {content.map((item, index) => {
            const itemText = toText(item);

            if (!itemText) return null;

            return hasHtmlMarkup(itemText) ? (
              <SanitizedHtmlRenderer
                key={`${itemText}-${index}`}
                html={itemText}
                className="internal-instruction-content min-w-0 max-w-full overflow-x-auto text-sm leading-6 break-words [overflow-wrap:anywhere] prose-a:break-all prose-code:break-words prose-pre:max-w-full prose-pre:overflow-x-auto [&_*]:max-w-full [&_li]:min-w-0 [&_li]:break-words [&_ol]:max-w-full [&_ul]:max-w-full"
              />
            ) : (
              <p
                key={`${itemText}-${index}`}
                className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300"
              >
                {itemText}
              </p>
            );
          })}
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {content.map((item, index) => (
          <li key={`${toText(item)}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{toText(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (hasHtmlMarkup(content)) {
    return (
      <SanitizedHtmlRenderer
        html={content}
        className="internal-instruction-content min-w-0 max-w-full overflow-x-auto text-sm leading-6 break-words [overflow-wrap:anywhere] prose-a:break-all prose-code:break-words prose-pre:max-w-full prose-pre:overflow-x-auto [&_*]:max-w-full [&_li]:min-w-0 [&_li]:break-words [&_ol]:max-w-full [&_ul]:max-w-full"
      />
    );
  }

  return (
    <p className="min-w-0 max-w-full whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">
      {content}
    </p>
  );
}

function DecisionResultPanel({ articles, decisionResult, onCopyTemplate, onManualSearch, onOpenSop }) {
  if (!decisionResult) return null;

  if (decisionResult.matched === false) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-black uppercase text-slate-500 dark:text-slate-400">Belum ditemukan</p>
        <h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">SOP belum ditemukan</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          SOP belum ditemukan berdasarkan kondisi yang dipilih. Silakan gunakan pencarian manual atau eskalasi ke supervisor.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onManualSearch}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cari manual di daftar SOP
          </button>
        </div>
      </section>
    );
  }

  const resolved = resolveDecisionData(decisionResult, articles);
  const activeFlags = Object.entries(resolved.flags).filter(([, value]) => Boolean(value));
  const templateText = htmlToPlainText(resolved.handling.templateChat || "");

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <p className="text-sm font-black uppercase text-emerald-700 dark:text-emerald-200">SOP Ditemukan</p>
      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <h3 className="text-2xl font-black text-slate-950 dark:text-white">{resolved.sopTitle}</h3>
          <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{resolved.ruleName}</p>
          <p className="mt-3 text-base font-bold text-slate-900 dark:text-white">{resolved.handling.title}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpenSop(resolved.sopId)}
          disabled={!resolved.sopId}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          Buka Detail SOP
        </button>
      </div>

      {resolved.requiredData.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-black text-slate-950 dark:text-white">Required data</h4>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {resolved.requiredData.map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-emerald-500/30 dark:bg-slate-950 dark:text-slate-200">
                <span className="flex h-5 w-5 items-center justify-center rounded border border-emerald-300 text-xs text-emerald-700 dark:border-emerald-500 dark:text-emerald-200">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeFlags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {activeFlags.map(([key]) => (
            <span
              key={key}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
            >
              {FLAG_LABELS[key] || formatLabel(key)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-4">
        <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-sm font-black text-slate-950 dark:text-white">Instruksi internal</h4>
          <div className="mt-3 min-w-0 max-w-full overflow-x-auto">
            <RichContent content={resolved.handling.instructions} />
          </div>
        </div>

        <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <h4 className="text-sm font-black text-slate-950 dark:text-white">Template chat</h4>
            <button
              type="button"
              onClick={() => onCopyTemplate(templateText)}
              disabled={!templateText}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:disabled:bg-slate-700"
            >
              Copy Template
            </button>
          </div>
          <div className="px-4 py-4">
            <RichContent content={resolved.handling.templateChat} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DecisionAssistantMode({ articles = [], onManualSearch, onOpenSop }) {
  const { showToast } = useToast();
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const [categories, setCategories] = useState([]);
  const [decisionResult, setDecisionResult] = useState(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSubCategories, setIsLoadingSubCategories] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isRunningDecision, setIsRunningDecision] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [subCategoryOptions, setSubCategoryOptions] = useState([]);
  const canRunDecision = Boolean(answers.logType && answers.category && answers.subCategory);

  useEffect(() => {
    if (!answers.logType) return undefined;

    let isCurrent = true;

    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const categoryData = await decisionService.getCategories(answers.logType);
        if (isCurrent) {
          setCategories(normalizeOptions(categoryData));
        }
      } catch (error) {
        if (isCurrent) {
          setCategories([]);
          showToast(error?.message || "Gagal memuat kategori decision.", "error");
        }
      } finally {
        if (isCurrent) {
          setIsLoadingCategories(false);
        }
      }
    };

    loadCategories();

    return () => {
      isCurrent = false;
    };
  }, [answers.logType, showToast]);

  useEffect(() => {
    if (!answers.logType || !answers.category) return undefined;

    let isCurrent = true;

    const loadSubCategories = async () => {
      try {
        setIsLoadingSubCategories(true);
        const optionData = await decisionService.getNextOptions({
          category: answers.category,
          logType: answers.logType,
        });
        if (isCurrent) {
          setSubCategoryOptions(normalizeOptions(optionData));
        }
      } catch (error) {
        if (isCurrent) {
          setSubCategoryOptions([]);
          showToast(error?.message || "Gagal memuat opsi kasus decision.", "error");
        }
      } finally {
        if (isCurrent) {
          setIsLoadingSubCategories(false);
        }
      }
    };

    loadSubCategories();

    return () => {
      isCurrent = false;
    };
  }, [answers.category, answers.logType, showToast]);

  useEffect(() => {
    if (!answers.logType || !answers.category || !answers.subCategory) return undefined;

    let isCurrent = true;

    const loadQuestions = async () => {
      try {
        setIsLoadingQuestions(true);
        const questionData = await decisionService.getQuestions({
          category: answers.category,
          logType: answers.logType,
          subCategory: answers.subCategory,
        });
        if (isCurrent) {
          setQuestions(Array.isArray(questionData) ? questionData : []);
        }
      } catch (error) {
        if (isCurrent) {
          setQuestions([]);
          showToast(error?.message || "Gagal memuat pertanyaan decision.", "error");
        }
      } finally {
        if (isCurrent) {
          setIsLoadingQuestions(false);
        }
      }
    };

    loadQuestions();

    return () => {
      isCurrent = false;
    };
  }, [answers.category, answers.logType, answers.subCategory, showToast]);

  const handleBasicChange = (field, value) => {
    setDecisionResult(null);
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [field]: value,
      ...(field === "logType" ? { category: "", subCategory: "", facts: {} } : {}),
      ...(field === "category" ? { subCategory: "", facts: {} } : {}),
      ...(field === "subCategory" ? { facts: {} } : {}),
    }));

    if (field === "logType") {
      setCategories([]);
      setSubCategoryOptions([]);
      setQuestions([]);
    }

    if (field === "category") {
      setSubCategoryOptions([]);
      setQuestions([]);
    }

    if (field === "subCategory") {
      setQuestions([]);
    }
  };

  const handleFactChange = (field, value) => {
    setDecisionResult(null);
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      facts: {
        ...currentAnswers.facts,
        [field]: value,
      },
    }));
  };

  const handleRunDecision = async () => {
    if (!canRunDecision) {
      showToast("Lengkapi jenis log, kategori, dan kasus terlebih dahulu.", "error");
      return;
    }

    try {
      setIsRunningDecision(true);
      const result = await decisionService.runDecision({
        category: answers.category,
        facts: answers.facts,
        logType: answers.logType,
        subCategory: answers.subCategory,
      });
      setDecisionResult(result);
      showToast("Decision selesai diproses.", "success");
    } catch (error) {
      showToast(error?.message || "Gagal menjalankan decision assistant.", "error");
    } finally {
      setIsRunningDecision(false);
    }
  };

  const handleReset = () => {
    setAnswers(INITIAL_ANSWERS);
    setCategories([]);
    setDecisionResult(null);
    setQuestions([]);
    setSubCategoryOptions([]);
  };

  const handleCopyTemplate = async (templateText) => {
    if (!templateText) {
      showToast("Template chat belum tersedia.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(templateText);
      showToast("Template decision berhasil disalin.", "success");
    } catch {
      showToast("Gagal menyalin template decision.", "error");
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-5 py-6 sm:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">Decision Assistant</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Bantu Pilih SOP</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Gunakan wizard ini untuk memilih SOP dan penanganan yang paling sesuai berdasarkan kondisi kasus user.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-6">
            <div>
              <p className="mb-3 text-sm font-black text-slate-950 dark:text-white">1. Pilih jenis log</p>
              <ChoiceGrid
                options={LOG_TYPE_OPTIONS}
                value={answers.logType}
                onChange={(value) => handleBasicChange("logType", value)}
              />
            </div>

            <div>
              <p className="mb-3 text-sm font-black text-slate-950 dark:text-white">2. Pilih kategori</p>
              {!answers.logType ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  Pilih jenis log terlebih dahulu untuk memuat kategori dari backend.
                </div>
              ) : isLoadingCategories ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : categories.length ? (
                <ChoiceGrid
                  options={categories}
                  value={answers.category}
                  onChange={(value) => handleBasicChange("category", value)}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  Belum ada kategori untuk jenis log ini.
                </div>
              )}
            </div>

            <div>
              <p className="mb-3 text-sm font-black text-slate-950 dark:text-white">3. Pilih kasus</p>
              {!answers.category ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  Pilih kategori terlebih dahulu untuk memuat opsi kasus dari backend.
                </div>
              ) : isLoadingSubCategories ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  ))}
                </div>
              ) : subCategoryOptions.length ? (
                <ChoiceGrid
                  options={subCategoryOptions}
                  value={answers.subCategory}
                  onChange={(value) => handleBasicChange("subCategory", value)}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  Belum ada opsi kasus untuk kategori ini.
                </div>
              )}
            </div>

            <div>
              <p className="mb-3 text-sm font-black text-slate-950 dark:text-white">4. Jawab pertanyaan lanjutan</p>
              {!answers.subCategory ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  Pilih kasus terlebih dahulu untuk memuat pertanyaan dari backend.
                </div>
              ) : isLoadingQuestions ? (
                <div className="space-y-3">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
                    />
                  ))}
                </div>
              ) : (
                <QuestionRenderer
                  answers={answers}
                  questions={questions}
                  onChange={handleFactChange}
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reset pilihan
            </button>
            <button
              type="button"
              onClick={handleRunDecision}
              disabled={!canRunDecision || isRunningDecision}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              {isRunningDecision ? "Mencari SOP..." : "Temukan SOP"}
            </button>
          </div>
        </section>

        {isRunningDecision ? (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-3">
              <div className="h-5 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-72 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          </section>
        ) : (
          <DecisionResultPanel
            articles={articles}
            decisionResult={decisionResult}
            onCopyTemplate={handleCopyTemplate}
            onManualSearch={onManualSearch}
            onOpenSop={onOpenSop}
          />
        )}
      </div>
    </div>
  );
}
