import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { aiRuleDraftService } from "../services/aiRuleDraftService";

const LOADING_MESSAGES = [
  "AI sedang menganalisis SOP...",
  "Membaca kondisi dan penanganan...",
  "Membuat draft rule...",
];

const FLAG_LABELS = {
  needEscalation: "Perlu Eskalasi",
  needEvidence: "Perlu Evidence",
  needJira: "Perlu Jira",
  needSupervisor: "Perlu Supervisor",
  needVerification: "Perlu Verifikasi",
};

const toText = (value) => {
  if (value && typeof value === "object" && "$oid" in value) return String(value.$oid || "").trim();
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const normalizeRoleLabel = (value) => toText(value).toLowerCase().replace(/[\s-]+/g, "_");

const roleValueToText = (value) => {
  if (!value || typeof value !== "object") return toText(value);
  return (
    toText(value.role) ||
    toText(value.name) ||
    toText(value.value) ||
    toText(value.title) ||
    toText(value.label)
  );
};

const canGenerateRuleDraft = (user) => {
  if (!user) return false;
  if (user.isAdmin || user.isSuperAdmin || user.is_admin || user.is_super_admin) return true;

  const roleSources = [
    user.role,
    user.userRole,
    user.roleName,
    user.type,
    user.accessLevel,
    ...(Array.isArray(user.roles) ? user.roles : []),
  ];

  return roleSources
    .map(roleValueToText)
    .map(normalizeRoleLabel)
    .some((role) => ["admin", "super_admin", "superadmin"].includes(role));
};

const getDraftId = (draftResult) =>
  toText(draftResult?.draftId) ||
  toText(draftResult?.draft?._id) ||
  toText(draftResult?.draft?.id);

const getDraft = (draftResult) => draftResult?.draft || null;

const getDraftRules = (draft) =>
  Array.isArray(draft?.draftRules)
    ? draft.draftRules
    : Array.isArray(draft?.rules)
      ? draft.rules
      : Array.isArray(draft?.sop_rules)
        ? draft.sop_rules
        : Array.isArray(draft?.sopRules)
          ? draft.sopRules
          : [];

const getDraftQuestions = (draft) =>
  Array.isArray(draft?.draftQuestions)
    ? draft.draftQuestions
    : Array.isArray(draft?.questions)
      ? draft.questions
      : Array.isArray(draft?.decision_questions)
        ? draft.decision_questions
        : Array.isArray(draft?.decisionQuestions)
          ? draft.decisionQuestions
          : [];

const getDraftCategories = (draft) =>
  Array.isArray(draft?.draftCategories)
    ? draft.draftCategories
    : Array.isArray(draft?.decision_categories)
      ? draft.decision_categories
      : Array.isArray(draft?.decisionCategories)
        ? draft.decisionCategories
        : Array.isArray(draft?.categories)
          ? draft.categories
          : [];

const getDraftOptions = (draft) =>
  Array.isArray(draft?.draftOptions)
    ? draft.draftOptions
    : Array.isArray(draft?.decision_options)
      ? draft.decision_options
      : Array.isArray(draft?.decisionOptions)
        ? draft.decisionOptions
        : Array.isArray(draft?.options)
          ? draft.options
          : [];

const getRuleHandlingId = (rule) =>
  toText(rule?.handlingId) ||
  toText(rule?.handling_id) ||
  toText(rule?.handling?.id) ||
  toText(rule?.handling?._id);

const getRuleRequiredData = (rule) =>
  rule?.requiredData ?? rule?.required_data ?? rule?.required_data_items ?? [];

const getRuleTemplate = (rule) =>
  toText(rule?.template) ||
  toText(rule?.templateChat) ||
  toText(rule?.template_chat) ||
  toText(rule?.nextAction) ||
  toText(rule?.next_action);

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

const normalizeOptions = (options = []) =>
  (Array.isArray(options) ? options : [])
    .map((option) => {
      if (typeof option === "string") return { label: option, value: option };
      return {
        label: toText(option?.label) || toText(option?.name) || toText(option?.value),
        value: toText(option?.value) || toText(option?.id) || toText(option?.label),
      };
    })
    .filter((option) => option.label || option.value);

const formatLabel = (value) =>
  toText(value)
    .replace(/[_-]+/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());

const isDraftValid = (draftResult) => {
  const draft = getDraft(draftResult);
  if (!draft || typeof draft !== "object") return false;

  return Boolean(
      toText(draft.sopId) ||
      toText(draft.sopTitle) ||
      getDraftRules(draft).length > 0 ||
      getDraftQuestions(draft).length > 0,
  );
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return "{}";
  }
};

const parseJsonArray = (value, label) => {
  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${label} harus berupa JSON valid.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${label} harus berupa array JSON.`);
  }

  return parsed;
};

const parseJsonArrayOrFallback = (value, label, fallback) => {
  try {
    return parseJsonArray(value, label);
  } catch {
    return fallback;
  }
};

const getPromptSopTitle = (context) =>
  toText(context?.title) ||
  toText(context?.sopTitle) ||
  toText(context?.article?.title) ||
  "SOP yang sedang diedit";

const buildOnlinePrompt = ({ promptContext, sopId }) => {
  const context = {
    ...promptContext,
    sopId,
  };

  return `Anda adalah AI assistant untuk membuat draft rule decision engine CaseFlow.

Tugas:
Baca data SOP berikut, lalu hasilkan JSON valid saja tanpa markdown, tanpa penjelasan, dan tanpa code fence.

Nama SOP:
${getPromptSopTitle(promptContext)}

SOP ID:
${sopId || "[WAJIB gunakan sopId yang tersedia dari sistem]"}

Data SOP:
${safeJsonStringify(context)}

Aturan output:
1. Output wajib berupa JSON object valid.
2. Jangan membuat rule aktif. Ini hanya draft untuk review admin.
3. Pastikan ada key berikut:
   - decision_categories
   - decision_options
   - decision_questions
   - sop_rules
4. Setiap item sop_rules wajib memiliki sopId dan handlingId.
5. handlingId wajib mengambil salah satu _id/id dari details.Penanganan pada data SOP.
6. Gunakan logType, category, subCategory, facts/conditions yang jelas dan bisa dipakai wizard.
7. Sertakan flags boolean bila relevan:
   - needVerification
   - needEscalation
   - needEvidence
   - needJira
   - needSupervisor

Format output yang diharapkan:
{
  "decision_categories": [
    {
      "logType": "Complaint",
      "category": "registrasi",
      "label": "Registrasi"
    }
  ],
  "decision_options": [
    {
      "logType": "Complaint",
      "category": "registrasi",
      "subCategory": "email_sudah_terdaftar",
      "label": "Email sudah terdaftar"
    }
  ],
  "decision_questions": [
    {
      "logType": "Complaint",
      "category": "registrasi",
      "subCategory": "email_sudah_terdaftar",
      "field": "caseType",
      "question": "Apa kendala utama user?",
      "inputType": "select",
      "options": [
        { "label": "Email sudah terdaftar", "value": "email_sudah_terdaftar" }
      ]
    }
  ],
  "sop_rules": [
    {
      "name": "Rule sesuai kasus",
      "sopId": "${sopId || "[sopId]"}",
      "handlingId": "[ambil dari details.Penanganan._id]",
      "logType": "Complaint",
      "category": "registrasi",
      "subCategory": "email_sudah_terdaftar",
      "conditions": [
        {
          "field": "caseType",
          "operator": "equals",
          "value": "email_sudah_terdaftar",
          "label": "Kasus email sudah terdaftar"
        }
      ],
      "requiredData": [],
      "flags": {
        "needVerification": false,
        "needEscalation": false,
        "needEvidence": false,
        "needJira": false,
        "needSupervisor": false
      }
    }
  ]
}`;
};

const stripCodeFence = (value = "") =>
  value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

const parseImportedJson = (value) => {
  const trimmedValue = stripCodeFence(value);
  if (!trimmedValue) throw new Error("JSON hasil AI belum diisi.");

  const parsedJson = JSON.parse(trimmedValue);
  if (!parsedJson || typeof parsedJson !== "object" || Array.isArray(parsedJson)) {
    throw new Error("JSON harus berupa object.");
  }

  const requiredKeys = ["decision_categories", "decision_options", "decision_questions", "sop_rules"];
  const missingKeys = requiredKeys.filter((key) => !Array.isArray(parsedJson[key]));

  if (missingKeys.length) {
    throw new Error(`JSON belum valid. Key wajib belum ada atau bukan array: ${missingKeys.join(", ")}.`);
  }

  return parsedJson;
};

function ModalShell({ children, maxWidth = "max-w-2xl", onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <section className={`relative z-10 max-h-[calc(100vh-2rem)] w-full ${maxWidth} overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900`}>
        {children}
      </section>
    </div>
  );
}

function ConfirmModal({ isGenerating, loadingMessage, onCancel, onConfirm }) {
  return (
    <ModalShell maxWidth="max-w-md" onClose={isGenerating ? undefined : onCancel}>
      <div className="p-6">
        <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">Generate Rule Draft</p>
        <h2 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
          Lanjutkan generate draft rule?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          AI akan menganalisis SOP ini dan membuat draft rule. Hasil tidak akan langsung aktif sebelum direview. Lanjutkan?
        </p>

        {isGenerating && (
          <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-300" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-200">{loadingMessage}</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isGenerating}
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isGenerating}
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400"
          >
            {isGenerating ? "Generating..." : "Generate Draft"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ImportJsonModal({
  importError,
  importJsonText,
  isImporting,
  onCancel,
  onCopyPrompt,
  onImport,
  onJsonChange,
  onValidate,
  promptText,
  validationMessage,
}) {
  return (
    <ModalShell maxWidth="max-w-5xl" onClose={isImporting ? undefined : onCancel}>
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">
          Generate Online / Import JSON
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          Import draft rule dari AI online
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Copy prompt ke ChatGPT/Gemini/DeepSeek, lalu paste hasil JSON ke sistem. Backend akan memvalidasi dan menyimpan sebagai draft pending review.
        </p>
      </div>

      <div className="grid gap-5 px-6 py-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-black text-slate-950 dark:text-white">Prompt untuk AI Online</h3>
            <button
              type="button"
              onClick={onCopyPrompt}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              Copy Prompt
            </button>
          </div>
          <textarea
            readOnly
            value={promptText}
            rows={22}
            className="w-full resize-none rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-5 text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </section>

        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-black text-slate-950 dark:text-white">Paste hasil JSON dari AI</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Paste JSON mentah tanpa markdown/code fence. Tombol validate mengecek format JSON di browser sebelum dikirim ke backend.
          </p>
          <textarea
            value={importJsonText}
            onChange={(event) => onJsonChange(event.target.value)}
            rows={22}
            placeholder='{"decision_categories":[],"decision_options":[],"decision_questions":[],"sop_rules":[]}'
            className="mt-3 w-full resize-none rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-5 text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
          />

          {validationMessage && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
              {validationMessage}
            </div>
          )}

          {importError && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
              {importError}
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
        <button
          type="button"
          disabled={isImporting}
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={isImporting}
          onClick={onValidate}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-indigo-200 px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:text-indigo-200 dark:hover:bg-indigo-500/10"
        >
          Validate Draft
        </button>
        <button
          type="button"
          disabled={isImporting}
          onClick={onImport}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:bg-indigo-400"
        >
          {isImporting ? "Menyimpan..." : "Save as Draft"}
        </button>
      </div>
    </ModalShell>
  );
}

function RuleDraftFlagsPreview({ flags = {} }) {
  const flagEntries = Object.entries(FLAG_LABELS);

  return (
    <div className="flex flex-wrap gap-2">
      {flagEntries.map(([key, label]) => {
        const isActive = Boolean(flags?.[key]);
        return (
          <span
            key={key}
            className={`rounded-full border px-3 py-1 text-xs font-black ${
              isActive
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-500"
            }`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

function RuleDraftConditionPreview({ conditions = [] }) {
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada kondisi rule.</p>;
  }

  return (
    <div className="grid gap-2">
      {conditions.map((condition, index) => (
        <div
          key={`${toText(condition?.field)}-${index}`}
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
        >
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            {toText(condition?.label) || `${formatLabel(condition?.field)} ${toText(condition?.operator)} ${toText(condition?.value)}`}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {toText(condition?.field) || "-"} / {toText(condition?.operator) || "-"} / {toText(condition?.value) || "-"}
          </p>
        </div>
      ))}
    </div>
  );
}

function RuleDraftQuestionPreview({ questions = [] }) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada pertanyaan wizard.</p>;
  }

  return (
    <div className="grid gap-3">
      {questions.map((question, index) => (
        <div
          key={`${toText(question?.field)}-${index}`}
          className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"
        >
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            {toText(question?.question) || `Pertanyaan ${index + 1}`}
          </p>
          <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            {toText(question?.field) || "-"} / {toText(question?.inputType) || toText(question?.input_type) || "text"}
          </p>
          {normalizeOptions(question?.options).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {normalizeOptions(question.options).map((option) => (
                <span
                  key={`${option.value}-${option.label}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {option.label || option.value}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EditableJsonSection({
  description,
  error,
  isVisible = true,
  onChange,
  onFormat,
  onToggle,
  rows = 8,
  title,
  value,
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
            >
              {isVisible ? "Sembunyikan" : "Tampilkan"}
            </button>
          )}
          {isVisible && (
            <button
              type="button"
              onClick={onFormat}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Format JSON
            </button>
          )}
        </div>
      </div>

      {isVisible && (
        <>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            rows={rows}
            className="mt-4 w-full rounded-lg border border-slate-300 bg-slate-950 px-3 py-3 font-mono text-xs leading-5 text-slate-100 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950"
          />
          {error && (
            <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
          )}
        </>
      )}
    </section>
  );
}

function DraftPreviewModal({
  draftResult,
  isApproving,
  isGenerating,
  isRejecting,
  loadingMessage,
  onApprove,
  onClose,
  onRegenerate,
  onReject,
}) {
  const draft = getDraft(draftResult);
  const draftId = getDraftId(draftResult);
  const rules = getDraftRules(draft);
  const questions = getDraftQuestions(draft);
  const categories = getDraftCategories(draft);
  const options = getDraftOptions(draft);
  const [categoryJsonText, setCategoryJsonText] = useState(() => safeJsonStringify(categories));
  const [categoryJsonError, setCategoryJsonError] = useState("");
  const [optionJsonText, setOptionJsonText] = useState(() => safeJsonStringify(options));
  const [optionJsonError, setOptionJsonError] = useState("");
  const [questionJsonText, setQuestionJsonText] = useState(() => safeJsonStringify(questions));
  const [questionJsonError, setQuestionJsonError] = useState("");
  const [ruleJsonText, setRuleJsonText] = useState(() => safeJsonStringify(rules));
  const [ruleJsonError, setRuleJsonError] = useState("");
  const [showOptionJson, setShowOptionJson] = useState(false);
  const [showQuestionJson, setShowQuestionJson] = useState(false);
  const [showRuleJson, setShowRuleJson] = useState(false);

  const displayRules = parseJsonArrayOrFallback(ruleJsonText, "sop_rules", rules);
  const displayQuestions = parseJsonArrayOrFallback(questionJsonText, "decision_questions", questions);

  const handleFormatJson = ({ label, setError, setText, text }) => {
    try {
      const parsedValue = parseJsonArray(text, label);
      setText(safeJsonStringify(parsedValue));
      setError("");
    } catch (error) {
      setError(error?.message || `${label} tidak valid.`);
    }
  };

  const showJsonError = (message) => {
    if (message.includes("decision_options")) {
      setOptionJsonError(message);
      setShowOptionJson(true);
      return;
    }

    if (message.includes("decision_questions")) {
      setQuestionJsonError(message);
      setShowQuestionJson(true);
      return;
    }

    if (message.includes("sop_rules")) {
      setRuleJsonError(message);
      setShowRuleJson(true);
      return;
    }

    setCategoryJsonError(message);
  };

  const handleApproveClick = () => {
    try {
      const parsedCategories = parseJsonArray(categoryJsonText, "decision_categories");
      const parsedOptions = parseJsonArray(optionJsonText, "decision_options");
      const parsedQuestions = parseJsonArray(questionJsonText, "decision_questions");
      const parsedRules = parseJsonArray(ruleJsonText, "sop_rules");
      setCategoryJsonError("");
      setOptionJsonError("");
      setQuestionJsonError("");
      setRuleJsonError("");
      onApprove({
        draftCategories: parsedCategories,
        draftOptions: parsedOptions,
        draftQuestions: parsedQuestions,
        draftRules: parsedRules,
      });
    } catch (error) {
      showJsonError(error?.message || "JSON draft tidak valid.");
    }
  };

  return (
    <ModalShell maxWidth="max-w-5xl" onClose={isApproving || isRejecting || isGenerating ? undefined : onClose}>
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
        <p className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-300">Preview Rule Draft</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              {toText(draft?.sopTitle) || "Draft rule SOP"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Draft ID: <span className="font-semibold">{draftId || "-"}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
              {toText(draft?.category) || "Kategori belum ada"}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {toText(draft?.logType) || "Jenis log belum ada"}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Mapping SOP</p>
            <p className="mt-2 break-all text-sm font-bold text-slate-950 dark:text-white">{toText(draft?.sopId) || "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Jumlah Rule</p>
            <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{displayRules.length}</p>
          </div>
        </div>

        <EditableJsonSection
          description="Edit JSON kategori decision sebelum draft disetujui. Data ini akan dikirim saat Approve & Save Rule."
          error={categoryJsonError}
          onChange={(value) => {
            setCategoryJsonText(value);
            setCategoryJsonError("");
          }}
          onFormat={() =>
            handleFormatJson({
              label: "decision_categories",
              setError: setCategoryJsonError,
              setText: setCategoryJsonText,
              text: categoryJsonText,
            })
          }
          rows={8}
          title="decision_categories"
          value={categoryJsonText}
        />

        <EditableJsonSection
          description="Edit JSON opsi kasus/subCategory yang akan muncul setelah kategori dipilih."
          error={optionJsonError}
          isVisible={showOptionJson}
          onChange={(value) => {
            setOptionJsonText(value);
            setOptionJsonError("");
          }}
          onFormat={() =>
            handleFormatJson({
              label: "decision_options",
              setError: setOptionJsonError,
              setText: setOptionJsonText,
              text: optionJsonText,
            })
          }
          onToggle={() => setShowOptionJson((isVisible) => !isVisible)}
          rows={8}
          title="decision_options / subCategory"
          value={optionJsonText}
        />

        <EditableJsonSection
          description="Edit pertanyaan wizard, inputType, options, category, subCategory, dan field facts."
          error={questionJsonError}
          isVisible={showQuestionJson}
          onChange={(value) => {
            setQuestionJsonText(value);
            setQuestionJsonError("");
          }}
          onFormat={() =>
            handleFormatJson({
              label: "decision_questions",
              setError: setQuestionJsonError,
              setText: setQuestionJsonText,
              text: questionJsonText,
            })
          }
          onToggle={() => setShowQuestionJson((isVisible) => !isVisible)}
          rows={10}
          title="decision_questions"
          value={questionJsonText}
        />

        <EditableJsonSection
          description="Edit rule hasil AI, termasuk name, category, subCategory, conditions, requiredData, flags, priority, dan handlingId."
          error={ruleJsonError}
          isVisible={showRuleJson}
          onChange={(value) => {
            setRuleJsonText(value);
            setRuleJsonError("");
          }}
          onFormat={() =>
            handleFormatJson({
              label: "sop_rules",
              setError: setRuleJsonError,
              setText: setRuleJsonText,
              text: ruleJsonText,
            })
          }
          onToggle={() => setShowRuleJson((isVisible) => !isVisible)}
          rows={12}
          title="sop_rules"
          value={ruleJsonText}
        />

        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-black text-slate-950 dark:text-white">Rule yang ditemukan</h3>
          <div className="mt-4 space-y-4">
            {displayRules.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada rule yang ditemukan.</p>
            ) : (
              displayRules.map((rule, index) => (
                <div
                  key={`${toText(rule?.name)}-${index}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-white">
                        {toText(rule?.name) || `Rule ${index + 1}`}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                        handlingId: {getRuleHandlingId(rule) || "-"}
                      </p>
                    </div>
                    <RuleDraftFlagsPreview flags={rule?.flags} />
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">Kondisi</p>
                      <RuleDraftConditionPreview conditions={rule?.conditions} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">Required data</p>
                      {normalizeList(getRuleRequiredData(rule)).length > 0 ? (
                        <ul className="grid gap-2">
                          {normalizeList(getRuleRequiredData(rule)).map((item) => (
                            <li
                              key={item}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tidak ada required data.</p>
                      )}
                    </div>
                  </div>

                  {getRuleTemplate(rule) && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Template / next action</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
                        {getRuleTemplate(rule)}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-black text-slate-950 dark:text-white">Pertanyaan wizard</h3>
          <div className="mt-4">
            <RuleDraftQuestionPreview questions={displayQuestions} />
          </div>
        </section>

        {isGenerating && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-200">{loadingMessage}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
        <button
          type="button"
          disabled={isApproving || isRejecting || isGenerating}
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Tutup
        </button>
        <button
          type="button"
          disabled={isApproving || isRejecting || isGenerating}
          onClick={onRegenerate}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-200 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/30 dark:text-amber-200 dark:hover:bg-amber-500/10"
        >
          {isGenerating ? "Regenerating..." : "Regenerate"}
        </button>
        <button
          type="button"
          disabled={isApproving || isRejecting || isGenerating || !draftId}
          onClick={onReject}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          {isRejecting ? "Menolak..." : "Reject Draft"}
        </button>
        <button
          type="button"
          disabled={isApproving || isRejecting || isGenerating || !draftId}
          onClick={handleApproveClick}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
        >
          {isApproving ? "Menyimpan..." : "Approve & Save Rule"}
        </button>
      </div>
    </ModalShell>
  );
}

export default function GenerateRuleDraftButton({
  className = "",
  disabled = false,
  onDraftGenerated,
  onEnsureSopId,
  onBeforeGenerate,
  promptContext,
  sopId,
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [draftResult, setDraftResult] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importJsonText, setImportJsonText] = useState("");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [resolvedPromptContext, setResolvedPromptContext] = useState(null);
  const [resolvedSopId, setResolvedSopId] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const canGenerate = useMemo(() => canGenerateRuleDraft(user), [user]);
  const loadingMessage = LOADING_MESSAGES[loadingIndex % LOADING_MESSAGES.length];
  const promptText = buildOnlinePrompt({
    promptContext: resolvedPromptContext || promptContext,
    sopId: resolvedSopId || sopId,
  });

  useEffect(() => {
    if (!isGenerating) return undefined;

    const intervalId = window.setInterval(() => {
      setLoadingIndex((currentIndex) => currentIndex + 1);
    }, 1800);

    return () => window.clearInterval(intervalId);
  }, [isGenerating]);

  if (!canGenerate) return null;

  const resolveSopForDraft = async () => {
    if (onBeforeGenerate) {
      const canContinue = await onBeforeGenerate();
      if (canContinue === false) return null;
    }

    const ensuredSop = onEnsureSopId ? await onEnsureSopId() : sopId;
    const ensuredSopId =
      typeof ensuredSop === "object"
        ? toText(ensuredSop?.sopId) || toText(ensuredSop?.id) || toText(ensuredSop?._id)
        : toText(ensuredSop);

    if (!ensuredSopId) {
      showToast("ID SOP belum tersedia. Simpan SOP terlebih dahulu.", "error");
      return null;
    }

    const ensuredContext =
      typeof ensuredSop === "object"
        ? ensuredSop.sop || ensuredSop.article || ensuredSop
        : promptContext;

    setResolvedSopId(ensuredSopId);
    setResolvedPromptContext(ensuredContext || promptContext || null);

    return {
      promptContext: ensuredContext || promptContext || null,
      sopId: ensuredSopId,
    };
  };

  const generateDraft = async ({ regenerate = false } = {}) => {
    if (regenerate) {
      const confirmed = window.confirm("Regenerate akan membuat draft versi baru dari SOP ini. Lanjutkan?");
      if (!confirmed) return;
    }

    try {
      setLoadingIndex(0);
      setIsGenerating(true);

      const resolvedSop = await resolveSopForDraft();
      if (!resolvedSop) return;

      const result = await aiRuleDraftService.generateRuleDraft(resolvedSop.sopId);

      if (!isDraftValid(result)) {
        showToast("Draft gagal dibuat karena format hasil AI tidak valid. Silakan coba regenerate atau cek backend parser.", "error");
        return;
      }

      setDraftResult(result);
      onDraftGenerated?.(result);
      setShowConfirmModal(false);
      setShowModeMenu(false);
      setShowPreviewModal(true);
      showToast("Draft rule berhasil dibuat.", "success");
    } catch (error) {
      const message =
        error?.status === 502
          ? "Gagal membuat draft rule karena layanan AI/backend sedang tidak tersedia. Pastikan service Qwen/backend aktif, lalu coba generate ulang."
          : error?.message || "Gagal membuat draft rule.";
      showToast(message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenImportModal = async () => {
    try {
      setShowModeMenu(false);
      const resolvedSop = await resolveSopForDraft();
      if (!resolvedSop) return;
      setImportError("");
      setValidationMessage("");
      setShowImportModal(true);
    } catch (error) {
      showToast(error?.message || "Gagal menyiapkan import JSON.", "error");
    }
  };

  const handleValidateImportJson = () => {
    try {
      parseImportedJson(importJsonText);
      setImportError("");
      setValidationMessage("Format JSON valid. Backend tetap akan memvalidasi relasi SOP dan handlingId saat disimpan.");
    } catch (error) {
      setValidationMessage("");
      setImportError(error?.message || "JSON tidak valid.");
    }
  };

  const handleImportJson = async () => {
    try {
      const rawJson = parseImportedJson(importJsonText);
      setImportError("");
      setValidationMessage("");
      setIsImporting(true);

      const currentSopId = resolvedSopId || sopId;
      if (!currentSopId) {
        showToast("ID SOP belum tersedia. Simpan SOP terlebih dahulu.", "error");
        return;
      }

      const result = await aiRuleDraftService.importRuleDraft(currentSopId, rawJson);

      if (!isDraftValid(result)) {
        showToast("Draft gagal diimport karena format response backend tidak valid.", "error");
        return;
      }

      setDraftResult(result);
      onDraftGenerated?.(result);
      setShowImportModal(false);
      setShowPreviewModal(true);
      showToast("Draft rule berhasil diimport dan masuk review.", "success");
    } catch (error) {
      setValidationMessage("");
      setImportError(error?.message || "Gagal menyimpan draft import.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      showToast("Prompt berhasil disalin.", "success");
    } catch {
      showToast("Gagal menyalin prompt.", "error");
    }
  };

  const handleApprove = async (payload = {}) => {
    const draftId = getDraftId(draftResult);

    try {
      setIsApproving(true);
      await aiRuleDraftService.approveDraft(draftId, payload);
      showToast("Rule draft berhasil disetujui dan disimpan.", "success");
      setShowPreviewModal(false);
      setDraftResult(null);
    } catch (error) {
      showToast(error?.message || "Gagal menyetujui rule draft.", "error");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    const draftId = getDraftId(draftResult);

    try {
      setIsRejecting(true);
      await aiRuleDraftService.rejectDraft(draftId);
      showToast("Draft rule ditolak.", "success");
      setShowPreviewModal(false);
      setDraftResult(null);
    } catch (error) {
      showToast(error?.message || "Gagal menolak draft rule.", "error");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          type="button"
          disabled={disabled || isGenerating || isImporting}
          onClick={() => setShowModeMenu((isOpen) => !isOpen)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
        >
          <span>{isGenerating ? loadingMessage : "Generate Rule Draft"}</span>
          {!isGenerating && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Beta
            </span>
          )}
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
          </svg>
        </button>

        {showModeMenu && (
          <div className="absolute bottom-full left-0 z-30 mb-2 w-full min-w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => {
                setShowModeMenu(false);
                setShowConfirmModal(true);
              }}
              className="block w-full px-4 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-100 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            >
              <span className="flex items-center gap-2">
                Generate dengan Qwen Lokal
                <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  Beta
                </span>
              </span>
              <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Hit endpoint lokal dan simpan draft pending review.
              </span>
            </button>
            <button
              type="button"
              onClick={handleOpenImportModal}
              className="block w-full border-t border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:text-slate-100 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200"
            >
              <span className="flex items-center gap-2">
                Generate Online / Import JSON
                <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  Beta
                </span>
              </span>
              <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Copy prompt, pakai AI online manual, lalu import JSON.
              </span>
            </button>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <ConfirmModal
          isGenerating={isGenerating}
          loadingMessage={loadingMessage}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={() => generateDraft()}
        />
      )}

      {showPreviewModal && draftResult && (
        <DraftPreviewModal
          key={getDraftId(draftResult) || safeJsonStringify(getDraft(draftResult))}
          draftResult={draftResult}
          isApproving={isApproving}
          isGenerating={isGenerating}
          isRejecting={isRejecting}
          loadingMessage={loadingMessage}
          onApprove={handleApprove}
          onClose={() => setShowPreviewModal(false)}
          onRegenerate={() => generateDraft({ regenerate: true })}
          onReject={handleReject}
        />
      )}

      {showImportModal && (
        <ImportJsonModal
          importError={importError}
          importJsonText={importJsonText}
          isImporting={isImporting}
          onCancel={() => setShowImportModal(false)}
          onCopyPrompt={handleCopyPrompt}
          onImport={handleImportJson}
          onJsonChange={(value) => {
            setImportJsonText(value);
            setImportError("");
            setValidationMessage("");
          }}
          onValidate={handleValidateImportJson}
          promptText={promptText}
          validationMessage={validationMessage}
        />
      )}
    </>
  );
}
