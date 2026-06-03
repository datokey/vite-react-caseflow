import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "./components/Navbar"; 
import SanitizedHtmlRenderer from "./components/SanitizedHtmlRenderer";
import EditPage from "./pages/EditPage";
import AdminSOPPage from "./pages/AdminSOPPage";
import CekMe from "./pages/cekMe";
import { useAuth } from "./hooks/useAuth";
import { useArticles } from "./hooks/useArticles";
import { useToast } from "./hooks/useToast";
import { ARTICLE_MESSAGES, ARTICLE_ROUTES } from "./lib/articleConstants";
import { escapeRegExp, hasHtmlMarkup, htmlToPlainText } from "./lib/htmlUtils";
import { articleService } from "./services/articleService";

const NAME_PLACEHOLDER = "Nama Pelanggan";
const GREETING_PLACEHOLDER = "Bapak/Ibu";
const SEARCH_HIGHLIGHT_CLASS =
  "rounded bg-amber-200/80 px-0.5 text-slate-950 ring-1 ring-amber-300/70 dark:bg-sky-400/30 dark:text-sky-50 dark:ring-sky-300/30";
const TEMPLATE_NAME_PATTERN =
  /\{\{\s*(nama|nama_pelanggan|namaPelanggan|customerName|customer_name|pelanggan)\s*\}\}|\{\s*(nama|nama_pelanggan|namaPelanggan|customerName|customer_name|pelanggan)\s*\}|\[\s*(nama|nama pelanggan|customer name|customerName|customer_name|pelanggan)\s*\]|<<\s*(nama|nama pelanggan|customer name|customerName|customer_name|pelanggan)\s*>>/gi;
const TEMPLATE_GREETING_PATTERN =
  /\{\{\s*(sapaan|salutation|greeting)\s*\}\}|\{\s*(sapaan|salutation|greeting)\s*\}|\[\s*(sapaan|salutation|greeting)\s*\]|<<\s*(sapaan|salutation|greeting)\s*>>|Bapak\s*\/\s*Ibu/gi;
const TEMPLATE_GREETING_WITH_NAME_PATTERN =
  /(?:\{\{\s*(sapaan|salutation|greeting)\s*\}\}|\{\s*(sapaan|salutation|greeting)\s*\}|\[\s*(sapaan|salutation|greeting)\s*\]|<<\s*(sapaan|salutation|greeting)\s*>>|Bapak\s*\/\s*Ibu)\s+(?:\{\{\s*(nama|nama_pelanggan|namaPelanggan|customerName|customer_name|pelanggan)\s*\}\}|\{\s*(nama|nama_pelanggan|namaPelanggan|customerName|customer_name|pelanggan)\s*\}|\[\s*(nama|nama pelanggan|customer name|customerName|customer_name|pelanggan)\s*\]|<<\s*(nama|nama pelanggan|customer name|customerName|customer_name|pelanggan)\s*>>)/gi;

const unwrapBackendValue = (value) => {
  if (value && typeof value === "object") {
    if ("$oid" in value) return value.$oid;
    if ("$date" in value) return value.$date;
  }

  return value;
};

const toText = (value) => {
  const unwrappedValue = unwrapBackendValue(value);

  if (typeof unwrappedValue === "string") return unwrappedValue.trim();
  if (typeof unwrappedValue === "number") return String(unwrappedValue);

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

const canManageSop = (user) => {
  if (!user) return false;
  if (
    user.isAdmin ||
    user.isSuperAdmin ||
    user.isAdministrator ||
    user.is_admin ||
    user.is_super_admin
  ) {
    return true;
  }

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
    .some((role) =>
      ["admin", "administrator", "super_admin", "superadmin"].includes(role),
    );
};

const splitTextList = (value) =>
  value
    .split(/\r?\n|;|•/)
    .map((item) => item.trim())
    .filter(Boolean);

const toTextList = (value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === "string" ? splitTextList(item) : [toText(item)]))
      .filter(Boolean);
  }

  if (typeof value === "string") return splitTextList(value);

  return toText(value) ? [toText(value)] : [];
};

const getFirstValue = (source, keys) => {
  if (!source || typeof source !== "object") return undefined;

  return keys
    .map((key) => source[key])
    .find((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "string") return value.trim();
      return value !== undefined && value !== null;
    });
};

const getSopId = (article) => {
  const id = toText(article?._id) || toText(article?.id);
  return id || article?.title || "";
};

const getAuthorName = (article) =>
  toText(article?.authorId?.username) ||
  toText(article?.author?.username) ||
  toText(article?.authorName) ||
  toText(article?.authorId) ||
  "-";

const getKeywordLabels = (article) => {
  const keywords = article?.keyword ?? article?.keywords ?? [];

  if (typeof keywords === "string") {
    return keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(keywords)) return [];

  return keywords
    .map((keyword) => toText(keyword?.keyword) || toText(keyword?.name) || toText(keyword))
    .filter(Boolean);
};

const LOG_TYPE_COLOR_MAP = {
  incident: "text-red-600 dark:text-red-400",
  complaint: "text-orange-500 dark:text-orange-400",
  request: "text-yellow-500 dark:text-yellow-400",
  inquiry: "text-green-600 dark:text-green-400",
  feedback: "text-blue-600 dark:text-blue-400",
  other: "text-gray-500 dark:text-gray-400",
};

const LOG_TYPE_ACCENT_COLOR_MAP = {
  incident: "#dc2626",
  complaint: "#f97316",
  request: "#eab308",
  inquiry: "#16a34a",
  feedback: "#2563eb",
  other: "#6b7280",
};

const getLogType = (article) =>
  toText(
    getFirstValue(article?.details, ["JenisLog", "jenisLog", "logType"]) ||
      article?.jenisLog ||
      article?.logType,
  ) || "Other";

const getLogTypeTitleClass = (article) => {
  const typeKey = getLogType(article).trim().toLowerCase();
  return LOG_TYPE_COLOR_MAP[typeKey] || LOG_TYPE_COLOR_MAP.other;
};

const getLogTypeAccentColor = (article) => {
  const typeKey = getLogType(article).trim().toLowerCase();
  return LOG_TYPE_ACCENT_COLOR_MAP[typeKey] || LOG_TYPE_ACCENT_COLOR_MAP.other;
};

const getCategory = (article) =>
  toText(
    getFirstValue(article?.details, ["JenisLog", "jenisLog", "kategori", "Kategori"]) ||
      article?.category ||
      article?.kategori,
  ) || "SOP Operasional";

const getConditions = (article) =>
  toTextList(getFirstValue(article?.details, ["Kondisi", "kondisi", "conditions", "condition"]));

const htmlToSearchText = (value) =>
  String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const getInstructionContent = (value, { includeInstructionText = false } = {}) => {
  if (Array.isArray(value)) {
    const cleanedItems = value.map((item) => toText(item)).filter(Boolean);

    if (cleanedItems.length === 1 && hasHtmlMarkup(cleanedItems[0])) {
      return {
        instructions: [],
        instructionsHtml: cleanedItems[0],
        instructionsText: includeInstructionText ? htmlToSearchText(cleanedItems[0]) : "",
      };
    }

    return {
      instructions: cleanedItems.flatMap((item) => splitTextList(item)),
      instructionsHtml: "",
      instructionsText: cleanedItems.join(" "),
    };
  }

  const textValue = toText(value);

  if (hasHtmlMarkup(textValue)) {
    return {
      instructions: [],
      instructionsHtml: textValue,
      instructionsText: includeInstructionText ? htmlToSearchText(textValue) : "",
    };
  }

  const instructions = toTextList(textValue);

  return {
    instructions,
    instructionsHtml: "",
    instructionsText: instructions.join(" "),
  };
};

const normalizeHandlingSteps = (article, options = {}) => {
  const { includeInstructionText = false } = options;
  const rawSteps = getFirstValue(article?.details, [
    "Penanganan",
    "penanganan",
    "handling",
    "steps",
    "alurPenanganan",
  ]);

  if (typeof rawSteps === "string") {
    const instructions = toTextList(rawSteps);
    return instructions.length
      ? [
          {
            id: `${getSopId(article)}-step-1`,
            title: "Tahap 1: Penanganan",
            instructions,
            instructionsHtml: "",
            instructionsText: instructions.join(" "),
            templateChat: "",
          },
        ]
      : [];
  }

  if (!Array.isArray(rawSteps)) return [];

  return rawSteps
    .map((step, index) => {
      if (typeof step === "string") {
        return {
          id: `${getSopId(article)}-step-${index + 1}`,
          title: `Tahap ${index + 1}`,
          instructions: toTextList(step),
          instructionsHtml: "",
          instructionsText: toTextList(step).join(" "),
          templateChat: "",
        };
      }

      const title =
        toText(
          getFirstValue(step, [
            "judulPenanganan",
            "judul",
            "title",
            "namaTahap",
            "tahap",
            "stage",
          ]),
        ) || `Tahap ${index + 1}`;
      const instructionContent = getInstructionContent(
        getFirstValue(step, [
          "instruksiInternal",
          "instruksi",
          "instructions",
          "langkah",
          "steps",
          "checklist",
        ]),
        { includeInstructionText },
      );
      const templateChat = toText(
        getFirstValue(step, [
          "templateChat",
          "template",
          "chatTemplate",
          "template_chat",
          "messageTemplate",
        ]),
      );

      return {
        id: toText(step?._id) || `${getSopId(article)}-step-${index + 1}`,
        title,
        instructions: instructionContent.instructions,
        instructionsHtml: instructionContent.instructionsHtml,
        instructionsText: instructionContent.instructionsText,
        templateChat,
      };
    })
    .filter((step) => step.title || step.instructions.length || step.instructionsHtml || step.templateChat);
};

const getWarningContent = (article) => {
  const warningSource =
    getFirstValue(article?.details, [
      "Catatan",
      "catatan",
      "Warning",
      "warning",
      "Warnings",
      "warnings",
      "CatatanWarning",
      "notes",
      "note",
    ]) ||
    getFirstValue(article, [
      "Catatan",
      "catatan",
      "Warning",
      "warning",
      "Warnings",
      "warnings",
      "CatatanWarning",
      "notes",
      "note",
    ]);

  const warningText = toText(warningSource);

  if (hasHtmlMarkup(warningText)) {
    return {
      warnings: [],
      warningsHtml: warningText,
      warningsText: htmlToSearchText(warningText),
    };
  }

  const warnings = toTextList(warningSource);

  return {
    warnings,
    warningsHtml: "",
    warningsText: warnings.join(" "),
  };
};

const getCustomerDisplayName = (customerName, customerGreeting) => {
  const trimmedName = customerName.trim();
  const trimmedGreeting = customerGreeting.trim();

  if (trimmedGreeting && trimmedName) return `${trimmedGreeting} ${trimmedName}`;
  if (trimmedGreeting) return trimmedGreeting;
  if (trimmedName) return trimmedName;

  return NAME_PLACEHOLDER;
};

const fillTemplate = (template, customerName, customerGreeting) => {
  const trimmedName = customerName.trim();
  const trimmedGreeting = customerGreeting.trim();
  const fullCustomerName = getCustomerDisplayName(customerName, customerGreeting);
  const greetingReplacement = trimmedGreeting
    ? fullCustomerName
    : `${GREETING_PLACEHOLDER}${trimmedName ? ` ${trimmedName}` : ""}`;

  return template
    .replace(TEMPLATE_GREETING_WITH_NAME_PATTERN, greetingReplacement)
    .replace(TEMPLATE_GREETING_PATTERN, trimmedGreeting ? fullCustomerName : GREETING_PLACEHOLDER)
    .replace(TEMPLATE_NAME_PATTERN, trimmedName || NAME_PLACEHOLDER);
};

const getSearchableText = (article) =>
  [
    article?.title,
    article?.content,
    getSopId(article),
    getAuthorName(article),
    getCategory(article),
    ...getKeywordLabels(article),
    ...getConditions(article),
    getWarningContent(article).warningsText,
    ...normalizeHandlingSteps(article, { includeInstructionText: true }).flatMap((step) => [
      step.title,
      ...step.instructions,
      step.instructionsText,
      hasHtmlMarkup(step.templateChat) ? htmlToSearchText(step.templateChat) : step.templateChat,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const withClipboardTimeout = (copyPromise) =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("Clipboard write timed out."));
    }, 800);

    copyPromise
      .then((result) => {
        window.clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });

const writeClipboardText = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await withClipboardTimeout(navigator.clipboard.writeText(text));
      return;
    } catch {
      // Browser tertentu menahan Clipboard API walau dipanggil dari klik.
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  const didCopy = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!didCopy) {
    throw new Error("Copy command failed.");
  }
};

const getHighlightParts = (text, query) => {
  const value = String(text ?? "");
  const trimmedQuery = String(query ?? "").trim();

  if (!trimmedQuery) return [{ text: value, isMatch: false }];

  const regex = new RegExp(escapeRegExp(trimmedQuery), "gi");
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: value.slice(lastIndex, match.index), isMatch: false });
    }

    parts.push({ text: match[0], isMatch: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    parts.push({ text: value.slice(lastIndex), isMatch: false });
  }

  return parts.length ? parts : [{ text: value, isMatch: false }];
};

function HighlightedText({ className = "", query, text }) {
  const parts = useMemo(() => getHighlightParts(text, query), [query, text]);

  return (
    <>
      {parts.map((part, index) =>
        part.isMatch ? (
          <mark key={`${part.text}-${index}`} className={`${SEARCH_HIGHLIGHT_CLASS} ${className}`}>
            {part.text}
          </mark>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </>
  );
}

function SopPreviewCard({ article, isSelected, onSelect, searchQuery }) {
  const category = getCategory(article);
  const conditions = getConditions(article);
  const handlingSteps = normalizeHandlingSteps(article);
  const keywordLabels = getKeywordLabels(article);
  const accentColor = getLogTypeAccentColor(article);
  const titleClassName = getLogTypeTitleClass(article);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-l-4 border-y border-r p-4 text-left transition ${
        isSelected
          ? "border-y-slate-300 border-r-slate-300 bg-slate-100 shadow-sm dark:border-y-slate-700 dark:border-r-slate-700 dark:bg-slate-800"
          : "border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50 dark:border-y-slate-800 dark:border-r-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80"
      } rounded-lg`}
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{category}</p>
        <h2 className={`line-clamp-2 text-base font-bold leading-snug ${titleClassName}`}>
          <HighlightedText text={article?.title || "Tanpa judul SOP"} query={searchQuery} />
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {conditions.length} kondisi / {handlingSteps.length} penanganan
        </p>
        {keywordLabels.length > 0 && (
          <p className="line-clamp-1 text-xs text-slate-400 dark:text-slate-500">
            <HighlightedText text={keywordLabels.join(", ")} query={searchQuery} />
          </p>
        )}
      </div>
    </button>
  );
}

function TemplateChatBox({
  copiedStepId,
  customerGreeting,
  customerName,
  onCopy,
  searchQuery,
  stepId,
  template,
}) {
  const filledTemplate = fillTemplate(template, customerName, customerGreeting);
  const copyText = htmlToPlainText(filledTemplate);
  const isCopied = copiedStepId === stepId;
  const shouldRenderHtml = hasHtmlMarkup(filledTemplate);

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <p className="min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200">Template chat</p>
        <button
          type="button"
          onClick={() => onCopy(copyText, stepId)}
          className="w-full shrink-0 rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:w-auto dark:border-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
        >
          {isCopied ? "Tersalin" : "Copy"}
        </button>
      </div>
      {shouldRenderHtml ? (
        <SanitizedHtmlRenderer
          html={filledTemplate}
          highlightClassName={SEARCH_HIGHLIGHT_CLASS}
          highlightQuery={searchQuery}
          className="min-w-0 overflow-x-auto px-4 py-4 text-sm leading-6 break-words [overflow-wrap:anywhere] prose-a:break-all prose-code:break-words prose-pre:max-w-full prose-pre:overflow-x-auto prose-ol:pl-5 prose-ul:pl-5 [&_*]:max-w-full [&_li]:min-w-0 [&_li]:break-words [&_ol]:max-w-full [&_ul]:max-w-full"
        />
      ) : (
        <p className="min-w-0 overflow-x-auto whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-slate-700 break-words [overflow-wrap:anywhere] dark:text-slate-300">
          <HighlightedText text={filledTemplate} query={searchQuery} />
        </p>
      )}
    </div>
  );
}

function TimelineStep({
  copiedStepId,
  customerGreeting,
  customerName,
  index,
  onCopy,
  searchQuery,
  step,
}) {
  return (
    <div className="relative pb-8 last:pb-0">
      <div className="absolute -left-[2.15rem] top-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white ring-4 ring-slate-50">
        {index + 1}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Tahap {index + 1}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-slate-950 dark:text-white">
            <HighlightedText text={step.title} query={searchQuery} />
          </h3>
        </div>

        {step.instructionsHtml ? (
          <SanitizedHtmlRenderer
            html={step.instructionsHtml}
            highlightClassName={SEARCH_HIGHLIGHT_CLASS}
            highlightQuery={searchQuery}
            className="internal-instruction-content min-w-0 overflow-x-auto text-sm leading-6 break-words [overflow-wrap:anywhere] prose-a:break-all prose-code:break-words prose-pre:max-w-full prose-pre:overflow-x-auto [&_*]:max-w-full [&_li]:min-w-0 [&_li]:break-words [&_ol]:max-w-full [&_ul]:max-w-full"
          />
        ) : step.instructions.length > 0 && (
          <ul className="space-y-2">
            {step.instructions.map((instruction, instructionIndex) => (
              <li
                key={`${step.id}-instruction-${instructionIndex}`}
                className="flex gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>
                  <HighlightedText text={instruction} query={searchQuery} />
                </span>
              </li>
            ))}
          </ul>
        )}

        {step.templateChat && (
          <TemplateChatBox
            template={step.templateChat}
            stepId={step.id}
            copiedStepId={copiedStepId}
            customerGreeting={customerGreeting}
            customerName={customerName}
            onCopy={onCopy}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
}

function DetailActionMenu({ isDeleting, onEdit, onRequestDelete }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleDeleteClick = () => {
    setIsMenuOpen(false);
    onRequestDelete();
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
      >
        Edit
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          aria-label="Buka menu aksi SOP"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus:ring-offset-slate-950"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <div
          role="menu"
          className={`absolute right-0 top-full z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl transition-all duration-150 dark:border-slate-800 dark:bg-slate-900 ${
            isMenuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            disabled={isDeleting}
            onClick={handleDeleteClick}
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SopWorkspace({
  article,
  canManage,
  copiedStepId,
  customerGreeting,
  customerName,
  isDeleting,
  onEdit,
  onCopyTemplate,
  onCustomerGreetingChange,
  onCustomerNameChange,
  onRequestDelete,
  searchQuery,
}) {
  const category = getCategory(article);
  const conditions = getConditions(article);
  const handlingSteps = normalizeHandlingSteps(article);
  const warningContent = getWarningContent(article);
  const warnings = warningContent.warnings;
  const keywordLabels = getKeywordLabels(article);
  const accentColor = getLogTypeAccentColor(article);
  const titleClassName = getLogTypeTitleClass(article);

  return (
    <article className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">{category}</p>
              <h1 className={`mt-2 text-2xl font-black leading-tight sm:text-3xl ${titleClassName}`}>
                <HighlightedText text={article?.title || "Tanpa judul SOP"} query={searchQuery} />
              </h1>
              {article?.content && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <HighlightedText text={article.content} query={searchQuery} />
                </p>
              )}
            </div>

            {canManage && (
              <DetailActionMenu
                isDeleting={isDeleting}
                onEdit={onEdit}
                onRequestDelete={onRequestDelete}
              />
            )}
          </div>

          {keywordLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywordLabels.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-200"
                >
                  <HighlightedText text={keyword} query={searchQuery} />
                </span>
              ))}
            </div>
          )}

          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_9rem] xl:max-w-xl">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nama pelanggan</span>
              <input
                type="text"
                value={customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                placeholder={NAME_PLACEHOLDER}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sapaan</span>
              <select
                value={customerGreeting}
                onChange={(event) => onCustomerGreetingChange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
              >
                <option value="">Bapak/Ibu</option>
                <option value="Bapak">Bapak</option>
                <option value="Ibu">Ibu</option>
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="px-5 py-6 sm:px-8">
        <section className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <div
            className="mb-4 border-l-4 pl-4"
            style={{ borderLeftColor: accentColor }}
          >
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Kondisi</h2>
          </div>

          {conditions.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {conditions.map((condition, index) => (
                <li
                  key={`${getSopId(article)}-condition-${index}`}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  <HighlightedText text={condition} query={searchQuery} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Belum ada kondisi yang tercatat.
            </p>
          )}
        </section>

        <section className="border-b border-slate-200 py-6 dark:border-slate-800">
          <h2 className="mb-6 text-lg font-bold text-slate-950 dark:text-white">Alur Penanganan</h2>

          {handlingSteps.length > 0 ? (
            <div className="relative ml-4 border-l border-slate-300 pl-8 dark:border-slate-700">
              {handlingSteps.map((step, index) => (
                <TimelineStep
                  key={step.id}
                  step={step}
                  index={index}
                  copiedStepId={copiedStepId}
                  customerGreeting={customerGreeting}
                  customerName={customerName}
                  onCopy={onCopyTemplate}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Belum ada alur penanganan yang tercatat.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <h2 className="text-base font-bold">Catatan / Warning</h2>
          {warningContent.warningsHtml ? (
            <SanitizedHtmlRenderer
              html={warningContent.warningsHtml}
              highlightQuery={searchQuery}
              highlightClassName={SEARCH_HIGHLIGHT_CLASS}
              className="internal-instruction-content mt-3 min-w-0 overflow-x-auto text-sm leading-6 break-words [overflow-wrap:anywhere] prose-a:break-all prose-code:break-words prose-pre:max-w-full prose-pre:overflow-x-auto [&_*]:max-w-full [&_li]:min-w-0 [&_li]:break-words [&_ol]:max-w-full [&_ul]:max-w-full"
            />
          ) : warnings.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {warnings.map((warning, index) => (
                <li key={`${getSopId(article)}-warning-${index}`} className="text-sm leading-6">
                  <HighlightedText text={warning} query={searchQuery} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6">
              Tidak ada catatan untuk SOP ini.
            </p>
          )}
        </section>
      </div>
    </article>
  );
}

function EmptyWorkspace({ title, message }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-6 text-center dark:bg-slate-950">
      <div className="max-w-md">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  );
}

function DeleteConfirmationModal({ article, isDeleting, onCancel, onConfirm }) {
  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Batalkan hapus SOP"
        className="absolute inset-0"
        onClick={isDeleting ? undefined : onCancel}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-sop-title"
        className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </div>

          <div className="min-w-0">
            <h2 id="delete-sop-title" className="text-lg font-black text-slate-950 dark:text-white">
              Hapus SOP
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus SOP ini?
            </p>
            <p className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-white">
              {article?.title || "Tanpa judul SOP"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {isDeleting ? "Menghapus..." : "Hapus SOP"}
          </button>
        </div>
      </section>
    </div>
  );
}

function HomePage() {
  const { articles: loadedArticles, errorMsg, isErrorArticles, isLoadingArticles } = useArticles();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerGreeting, setCustomerGreeting] = useState("");
  const [copiedStepId, setCopiedStepId] = useState("");
  const [deleteTargetArticle, setDeleteTargetArticle] = useState(null);
  const [isDeletingArticle, setIsDeletingArticle] = useState(false);
  const searchInputRef = useRef(null);
  const userCanManageSop = useMemo(() => canManageSop(user), [user]);

  const articles = useMemo(
    () => (Array.isArray(loadedArticles) ? loadedArticles : []),
    [loadedArticles],
  );
  const searchQuery = searchInput.trim();

  const filteredArticles = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase();

    if (!normalizedSearch) return articles;

    return articles.filter((article) => getSearchableText(article).includes(normalizedSearch));
  }, [articles, searchQuery]);

  const visibleSelectedArticleId = useMemo(() => {
    if (!filteredArticles.length) return "";

    const selectedIsVisible = filteredArticles.some(
      (article) => getSopId(article) === selectedArticleId,
    );

    return selectedIsVisible ? selectedArticleId : getSopId(filteredArticles[0]);
  }, [filteredArticles, selectedArticleId]);

  const selectedArticle = useMemo(
    () =>
      filteredArticles.find((article) => getSopId(article) === visibleSelectedArticleId) || null,
    [filteredArticles, visibleSelectedArticleId],
  );

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleCopyTemplate = async (template, stepId) => {
    try {
      await writeClipboardText(template);
      setCopiedStepId(stepId);
      showToast("Template chat berhasil disalin.", "success");

      window.setTimeout(() => {
        setCopiedStepId((currentStepId) => (currentStepId === stepId ? "" : currentStepId));
      }, 1600);
    } catch {
      showToast(ARTICLE_MESSAGES.copyFailed, "error");
    }
  };

  const handleEditArticle = (article) => {
    const sopId = getSopId(article);

    if (!sopId) {
      showToast(ARTICLE_MESSAGES.missingId, "error");
      return;
    }

    navigate(ARTICLE_ROUTES.edit(encodeURIComponent(sopId)));
  };

  const handleRequestDeleteArticle = (article) => {
    setDeleteTargetArticle(article);
  };

  const handleCancelDeleteArticle = () => {
    if (!isDeletingArticle) {
      setDeleteTargetArticle(null);
    }
  };

  const handleConfirmDeleteArticle = async () => {
    const targetArticle = deleteTargetArticle;
    const targetId = getSopId(targetArticle);

    if (!targetId) {
      showToast(ARTICLE_MESSAGES.missingId, "error");
      return;
    }

    try {
      setIsDeletingArticle(true);
      await articleService.deleteArticle(targetId);

      const nextArticle = filteredArticles.find((article) => getSopId(article) !== targetId);
      setSelectedArticleId(nextArticle ? getSopId(nextArticle) : "");
      setDeleteTargetArticle(null);
      showToast(ARTICLE_MESSAGES.deleteSuccess, "success");
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error) {
      showToast(error?.message || ARTICLE_MESSAGES.deleteFailed, "error");
    } finally {
      setIsDeletingArticle(false);
    }
  };

  return (
    <>
      <main className="min-h-[calc(100vh-4rem)] bg-slate-100 text-slate-950 lg:grid lg:grid-cols-[minmax(20rem,35%)_minmax(0,65%)] dark:bg-slate-950 dark:text-white">
        <aside className="border-r border-slate-200 bg-white lg:h-[calc(100vh-4rem)] lg:overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
          <div className="sticky top-16 z-10 border-b border-slate-200 bg-white p-4 sm:p-5 lg:top-0 dark:border-slate-800 dark:bg-slate-950">
          <label className="block">
            <span className="sr-only">Cari SOP</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari SOP..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20"
            />
          </label>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
          {isLoadingArticles && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {ARTICLE_MESSAGES.loadingList}
            </div>
          )}

          {isErrorArticles && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              Gagal memuat data: {errorMsg}
            </div>
          )}

          {!isLoadingArticles && !isErrorArticles && filteredArticles.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {ARTICLE_MESSAGES.emptyList}
            </div>
          )}

          {!isLoadingArticles &&
            !isErrorArticles &&
            filteredArticles.map((article) => {
              const sopId = getSopId(article);

              return (
                <SopPreviewCard
                  key={sopId}
                  article={article}
                  isSelected={sopId === visibleSelectedArticleId}
                  onSelect={() => setSelectedArticleId(sopId)}
                  searchQuery={searchQuery}
                />
              );
            })}
          </div>
        </aside>

        <section className="lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
        {isLoadingArticles && (
          <EmptyWorkspace
            title="Memuat SOP"
            message="Workspace akan tersedia setelah data selesai dimuat."
          />
        )}

        {!isLoadingArticles && isErrorArticles && (
          <EmptyWorkspace
            title="Data SOP belum tersedia"
            message="Periksa koneksi API atau konfigurasi endpoint artikel."
          />
        )}

        {!isLoadingArticles && !isErrorArticles && !selectedArticle && (
          <EmptyWorkspace
            title="SOP tidak ditemukan"
            message="Coba gunakan kata kunci lain pada panel pencarian."
          />
        )}

        {!isLoadingArticles && !isErrorArticles && selectedArticle && (
          <SopWorkspace
            article={selectedArticle}
            canManage={userCanManageSop}
            copiedStepId={copiedStepId}
            customerGreeting={customerGreeting}
            customerName={customerName}
            isDeleting={isDeletingArticle && getSopId(deleteTargetArticle) === getSopId(selectedArticle)}
            onEdit={() => handleEditArticle(selectedArticle)}
            onCopyTemplate={handleCopyTemplate}
            onCustomerGreetingChange={setCustomerGreeting}
            onCustomerNameChange={setCustomerName}
            onRequestDelete={() => handleRequestDeleteArticle(selectedArticle)}
            searchQuery={searchQuery}
          />
        )}
        </section>
      </main>

      <DeleteConfirmationModal
        article={deleteTargetArticle}
        isDeleting={isDeletingArticle}
        onCancel={handleCancelDeleteArticle}
        onConfirm={handleConfirmDeleteArticle}
      />
    </>
  );
}

const IMPORTANT_LINKS = [
  {
    title: "Buat Template SOP",
    description: "Buka form pembuatan SOP/template baru.",
    to: "/admin/sop",
  },
  {
    title: "Dashboard Admin",
    description: "Kelola template SOP dari halaman admin.",
    to: "/admin/sop",
  },
  {
    title: "Profile",
    description: "Lihat status autentikasi dan data akun aktif.",
    to: "/cek-me",
  },
];

function ImportantLinksPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase text-indigo-600 dark:text-indigo-300">Navigasi Cepat</p>
          <h1 className="mt-2 text-3xl font-black">Link Penting</h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {IMPORTANT_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40 dark:hover:bg-indigo-500/10"
            >
              <h2 className="font-bold text-slate-950 dark:text-white">{link.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} /> 
        <Route path="/edit/:id" element={<EditPage />} />
        <Route path="/sop/:id/edit" element={<EditPage />} />
        <Route path="/admin/sop" element={<AdminSOPPage />} />
        <Route path="/cek-me" element={<CekMe />} />
        <Route path="/links" element={<ImportantLinksPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
