import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AuthModal from "./components/AuthModal";
import DecisionAssistantMode from "./components/DecisionAssistantMode";
import Navbar from "./components/Navbar"; 
import QuickNotesDrawer from "./components/QuickNotesDrawer";
import SanitizedHtmlRenderer from "./components/SanitizedHtmlRenderer";
import EditPage from "./pages/EditPage";
import AdminSOPPage from "./pages/AdminSOPPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CekMe from "./pages/cekMe";
import { useAuth } from "./hooks/useAuth";
import { useArticles } from "./hooks/useArticles";
import { useToast } from "./hooks/useToast";
import { ARTICLE_MESSAGES, ARTICLE_ROUTES } from "./lib/articleConstants";
import { isPasswordChangeRequired } from "./lib/authUtils";
import { escapeRegExp, hasHtmlMarkup, htmlToPlainText } from "./lib/htmlUtils";
import { articleService } from "./services/articleService";
import { authService } from "./services/authService";
import { recordingService } from "./services/recordingService";
import { sopUsageService } from "./services/sopUsageService";

const NAME_PLACEHOLDER = "Nama Pelanggan";
const CUSTOMER_NAME_INPUT_PLACEHOLDER = "Nama User";
const GREETING_PLACEHOLDER = "Bapak/Ibu";
const SEARCH_HIGHLIGHT_MARK_CLASS = "sop-search-highlight";
const SEARCH_HIGHLIGHT_PULSE_CLASS = "sop-search-highlight-pulse";
const SEARCH_HIGHLIGHT_CLASS =
  `${SEARCH_HIGHLIGHT_MARK_CLASS} rounded bg-amber-200/80 px-0.5 text-slate-950 ring-1 ring-amber-300/70 dark:bg-sky-400/30 dark:text-sky-50 dark:ring-sky-300/30`;
const LAST_SELECTED_SOP_STORAGE_KEY = "lastSelectedSopId";
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

const toTitleCaseName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);

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

const isSuperAdminUser = (user) => {
  if (!user) return false;
  if (user.isSuperAdmin || user.is_super_admin) return true;

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
    .some((role) => ["superadmin", "super_admin"].includes(role));
};

const canAccessAdminRoute = (user) => {
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
    .some((role) => ["admin", "superadmin", "super_admin"].includes(role));
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

const getLastSelectedSopId = () => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LAST_SELECTED_SOP_STORAGE_KEY) || "";
};

const saveLastSelectedSopId = (sopId) => {
  if (typeof window === "undefined" || !sopId) return;
  window.localStorage.setItem(LAST_SELECTED_SOP_STORAGE_KEY, sopId);
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

const isElementInViewport = (element) => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth;
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

function SopPreviewCard({ article, isPopular = false, isSelected, onSelect, searchQuery }) {
  const category = getCategory(article);
  const conditions = getConditions(article);
  const handlingSteps = normalizeHandlingSteps(article);
  const keywordLabels = getKeywordLabels(article);
  const accentColor = getLogTypeAccentColor(article);

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
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">{category}</p>
            <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-slate-950 dark:text-white">
              <HighlightedText text={article?.title || "Tanpa judul SOP"} query={searchQuery} />
            </h2>
          </div>
          {isPopular && (
            <span
              aria-label="Case populer"
              className="shrink-0 rounded-full bg-orange-50 px-2 py-1 text-xs leading-none text-orange-600 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-400/30"
              title="Case populer 24 jam terakhir"
            >
              🔥
            </span>
          )}
        </div>
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
  onCopyCustomerName,
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
  const sopId = getSopId(article);
  const accentColor = getLogTypeAccentColor(article);

  return (
    <article className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-slate-500 dark:text-slate-400">{category}</p>
              <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl dark:text-white">
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

          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto_9rem] xl:max-w-2xl">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nama User</span>
              <input
                type="text"
                value={customerName}
                onChange={(event) => onCustomerNameChange(event.target.value)}
                placeholder={CUSTOMER_NAME_INPUT_PLACEHOLDER}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/20"
              />
            </label>

            <button
              type="button"
              onClick={onCopyCustomerName}
              disabled={!customerName.trim()}
              className="inline-flex h-[42px] items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
            >
              Copy Nama User
            </button>

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
                  onCopy={(template, stepId) => onCopyTemplate(template, stepId, sopId)}
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

function BetaBadge() {
  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      Beta
    </span>
  );
}

function SopModeTabs({ canShowDetailSop, canUseDecisionAssistant, mode, onModeChange }) {
  const tabs = [
    ...(canShowDetailSop ? [{ label: "Detail SOP", value: "detail" }] : []),
    ...(canUseDecisionAssistant
      ? [{ isBeta: true, label: "Bantu Pilih SOP", value: "decision" }]
      : []),
  ];

  if (!tabs.length) return null;

  return (
    <div className="border-b border-slate-200 bg-white px-5 py-3 sm:px-8 dark:border-slate-800 dark:bg-slate-950">
      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {tabs.map((tab) => {
          const isActive = mode === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onModeChange(tab.value)}
              className={`h-9 rounded-md px-3 text-sm font-bold transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500"
                  : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {tab.label}
                {tab.isBeta && <BetaBadge />}
              </span>
            </button>
          );
        })}
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

const RECORDING_CHANNELS = [
  { key: "wa-cc", label: "WA CC", icon: "whatsapp", colorClass: "bg-emerald-500" },
  { key: "wa-g", label: "WA G", icon: "whatsapp", colorClass: "bg-lime-800" },
  { key: "email", label: "Email", icon: "email", colorClass: "bg-sky-500" },
  { key: "livechat", label: "Livechat", icon: "livechat", colorClass: "bg-violet-500" },
  { key: "tiktok", label: "TikTok", icon: "tiktok", colorClass: "bg-slate-950" },
  { key: "fb", label: "FB", icon: "facebook", colorClass: "bg-blue-600" },
  { key: "ig", label: "IG", icon: "instagram", colorClass: "bg-pink-500" },
  { key: "x", label: "X", icon: "x", colorClass: "bg-slate-950" },
  { key: "call", label: "Call", icon: "call", colorClass: "bg-teal-600" },
];

const createEmptyRecordingCounters = () =>
  RECORDING_CHANNELS.reduce((counters, channel) => {
    counters[channel.key] = 0;
    return counters;
  }, {});

function RecordingChannelIcon({ channel, className = "h-4 w-4" }) {
  const icon = channel?.icon;
  const commonProps = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (icon === "whatsapp") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M4.5 19.5 5.6 16.2A8 8 0 1 1 8 18.4Z" />
        <path d="M9 8.5c.3 3 2.2 5 5.5 6" />
        <path d="m9.4 8.8.9-1.1" />
        <path d="m14.1 14.2 1.3-.8" />
      </svg>
    );
  }

  if (icon === "email") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M4 6h16v12H4Z" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  if (icon === "livechat") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M5 6h14v9H8l-3 3Z" />
        <path d="M9 10h6" />
        <path d="M9 13h4" />
      </svg>
    );
  }

  if (icon === "tiktok") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
        <path d="M14 4c.7 2.2 2.2 3.8 4.5 4.2" />
      </svg>
    );
  }

  if (icon === "facebook") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14.3 8H17V4.6A16 16 0 0 0 13.9 4c-3.1 0-5.2 1.9-5.2 5.3V12H5.5v3.8h3.2V23h3.9v-7.2h3.2l.5-3.8h-3.7V9.7c0-1.1.3-1.7 1.7-1.7Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (icon === "instagram") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="4" />
        <circle cx="12" cy="12" r="3" />
        <path d="M16.5 7.5h.01" />
      </svg>
    );
  }

  if (icon === "x") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="m5 5 14 14" />
        <path d="M19 5 5 19" />
      </svg>
    );
  }

  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

function FloatingDrawerCounter() {
  const { showToast } = useToast();
  const [activeChannelKey, setActiveChannelKey] = useState(RECORDING_CHANNELS[0].key);
  const [counters, setCounters] = useState(createEmptyRecordingCounters);
  const [isLoadingCounters, setIsLoadingCounters] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pendingChannelKeys, setPendingChannelKeys] = useState({});

  const activeChannel =
    RECORDING_CHANNELS.find((channel) => channel.key === activeChannelKey) || RECORDING_CHANNELS[0];
  const activeCounter = counters[activeChannel.key] || 0;

  useEffect(() => {
    let isActive = true;

    const loadTodayCounters = async () => {
      try {
        setIsLoadingCounters(true);
        const todayCounters = await recordingService.getTodayCounters();

        if (!isActive) return;

        setCounters((currentCounters) => ({
          ...currentCounters,
          ...todayCounters,
        }));
      } catch (error) {
        if (isActive) {
          showToast(error?.message || "Gagal memuat counter tiket harian.", "error");
        }
      } finally {
        if (isActive) {
          setIsLoadingCounters(false);
        }
      }
    };

    loadTodayCounters();

    return () => {
      isActive = false;
    };
  }, [showToast]);

  const updateChannelCounter = async (channelKey, action) => {
    const currentValue = counters[channelKey] || 0;
    const optimisticValue =
      action === "increment" ? currentValue + 1 : Math.max(0, currentValue - 1);

    if (action === "decrement" && currentValue <= 0) {
      return;
    }

    setCounters((currentCounters) => ({
      ...currentCounters,
      [channelKey]: optimisticValue,
    }));
    setPendingChannelKeys((currentPending) => ({ ...currentPending, [channelKey]: true }));

    try {
      const savedValue =
        action === "increment"
          ? await recordingService.increment(channelKey, currentValue)
          : await recordingService.decrement(channelKey, currentValue);

      setCounters((currentCounters) => ({
        ...currentCounters,
        [channelKey]: savedValue,
      }));
    } catch (error) {
      setCounters((currentCounters) => ({
        ...currentCounters,
        [channelKey]: currentValue,
      }));
      showToast(error?.message || "Gagal memperbarui counter tiket.", "error");
    } finally {
      setPendingChannelKeys((currentPending) => {
        const nextPending = { ...currentPending };
        delete nextPending[channelKey];
        return nextPending;
      });
    }
  };

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex flex-col-reverse items-start ${
        isDrawerOpen ? "w-56" : "w-14"
      }`}
      onMouseEnter={() => setIsDrawerOpen(true)}
      onMouseLeave={() => setIsDrawerOpen(false)}
      onFocus={() => setIsDrawerOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsDrawerOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => updateChannelCounter(activeChannel.key, "increment")}
        disabled={Boolean(pendingChannelKeys[activeChannel.key])}
        aria-label={`Tambah counter ${activeChannel.label}`}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-sm font-black text-white shadow-xl transition hover:scale-105 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${activeChannel.colorClass || "bg-slate-800"}`}
        >
          <RecordingChannelIcon channel={activeChannel} className="h-5 w-5" />
        </span>
        <span className="absolute -right-1 -top-1 min-w-6 rounded-full border-2 border-white bg-amber-400 px-1.5 py-0.5 text-center text-xs font-black text-slate-950 dark:border-slate-950">
          {activeCounter}
        </span>
      </button>

      {isDrawerOpen && (
        <div className="mb-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-2 opacity-100 shadow-2xl backdrop-blur transition duration-200 dark:border-slate-800 dark:bg-slate-950/95">
          {RECORDING_CHANNELS.map((channel) => {
            const counter = counters[channel.key] || 0;
            const isActiveChannel = activeChannelKey === channel.key;
            const isPending = Boolean(pendingChannelKeys[channel.key]);

            return (
              <div
                key={channel.key}
                className={`flex w-52 items-center gap-2 rounded-lg border px-2 py-2 transition ${
                  isActiveChannel
                    ? "border-indigo-200 bg-indigo-50 dark:border-indigo-500/30 dark:bg-indigo-500/15"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveChannelKey(channel.key)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white dark:bg-slate-700">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${channel.colorClass || "bg-slate-800"}`}
                    >
                      <RecordingChannelIcon channel={channel} className="h-4 w-4" />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                      {channel.label}
                    </span>
                    <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {counter} tiket
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateChannelCounter(channel.key, "decrement")}
                    disabled={isPending || counter <= 0}
                    aria-label={`Kurangi counter ${channel.label}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-lg font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => updateChannelCounter(channel.key, "increment")}
                    disabled={isPending}
                    aria-label={`Tambah counter ${channel.label}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-lg font-black text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-indigo-500"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}

          {isLoadingCounters && (
            <p className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Memuat counter...
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const ANALYTICS_PERIODS = [
  { value: "daily", label: "Hari Ini" },
  { value: "monthly", label: "Bulan Ini" },
];

const sumCounters = (counters) =>
  RECORDING_CHANNELS.reduce((total, channel) => total + (counters[channel.key] || 0), 0);

const sumTrend = (trend) => trend.reduce((total, item) => total + (item.total || 0), 0);

const getTopChannel = (counters) =>
  RECORDING_CHANNELS.reduce(
    (topChannel, channel) => {
      const count = counters[channel.key] || 0;
      return count > topChannel.count ? { ...channel, count } : topChannel;
    },
    { ...RECORDING_CHANNELS[0], count: 0 },
  );

const formatTrendDate = (date) => {
  const dateText = String(date || "");
  const parsedDate = new Date(dateText);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
    });
  }

  return dateText;
};

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-8 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, helper, tone = "slate", tooltip }) {
  const toneClassMap = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200",
    slate: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };

  return (
    <div className="group relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
      <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${toneClassMap[tone]}`}>
        {helper}
        {tooltip && (
          <span
            aria-label={tooltip}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-black leading-none opacity-80"
            tabIndex={0}
          >
            ?
          </span>
        )}
      </p>
      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute bottom-4 left-5 right-5 z-20 translate-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-600 opacity-0 shadow-lg transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

function ChannelBarChart({ counters }) {
  const maxValue = Math.max(...RECORDING_CHANNELS.map((channel) => counters[channel.key] || 0), 1);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">Volume per Channel</h2>
      <div className="mt-5 space-y-4">
        {RECORDING_CHANNELS.map((channel) => {
          const value = counters[channel.key] || 0;
          const width = `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`;

          return (
            <div key={channel.key} className="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_3rem] sm:items-center">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${channel.colorClass}`}>
                  <RecordingChannelIcon channel={channel} className="h-4 w-4" />
                </span>
                {channel.label}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width }}
                />
              </div>
              <p className="text-right text-sm font-black text-slate-900 dark:text-white">{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyTrendChart({ trend }) {
  const maxValue = Math.max(...trend.map((item) => item.total), 1);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">Tren Tiket Bulanan</h2>
      <div className="mt-5 space-y-3">
        {trend.map((item) => {
          const width = `${Math.max((item.total / maxValue) * 100, item.total > 0 ? 8 : 0)}%`;

          return (
            <div key={item.date} className="grid gap-2 sm:grid-cols-[7rem_minmax(0,1fr)_5rem] sm:items-center">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {formatTrendDate(item.date)}
              </p>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width }}
                />
              </div>
              <p className="text-right text-sm font-black text-slate-900 dark:text-white">
                {item.total} tiket
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsDashboard() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState("daily");
  const [isLoading, setIsLoading] = useState(false);
  const [counters, setCounters] = useState(createEmptyRecordingCounters);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    let isActive = true;

    const loadStatistics = async () => {
      try {
        setIsLoading(true);
        const statistics = await recordingService.getStatistics(period);

        if (!isActive) return;

        setCounters((currentCounters) => ({
          ...currentCounters,
          ...statistics.counters,
        }));
        setTrend(statistics.trend);
      } catch (error) {
        if (isActive) {
          setCounters(createEmptyRecordingCounters());
          setTrend([]);
          showToast(error?.message || "Gagal memuat statistik kerja.", "error");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadStatistics();

    return () => {
      isActive = false;
    };
  }, [period, showToast]);

  const channelTotalVolume = sumCounters(counters);
  const trendTotalVolume = sumTrend(trend);
  const totalVolume = channelTotalVolume || trendTotalVolume;
  const topChannel = getTopChannel(counters);
  const topChannelPercentage = totalVolume > 0 ? Math.round((topChannel.count / totalVolume) * 100) : 0;
  const hasData = totalVolume > 0 || trend.some((item) => item.total > 0);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-800">
          <div>
            <p className="text-sm font-bold uppercase text-indigo-600 dark:text-indigo-300">Statistik Kerja</p>
            <h1 className="mt-2 text-3xl font-black">Analytics Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ringkasan performa tiket berdasarkan counter harian per channel.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {ANALYTICS_PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                  period === item.value
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <AnalyticsSkeleton />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SummaryCard
                  label="Total Volume"
                  value={totalVolume}
                  helper={period === "daily" ? "Total Tiket Hari Ini" : "Total Tiket Bulan Ini"}
                  tone="indigo"
                />
                <SummaryCard
                  label="Channel Tertinggi"
                  value={topChannel.count > 0 ? topChannel.label : "-"}
                  helper={`${topChannel.count} tiket • ${topChannelPercentage}%`}
                  tone="emerald"
                  tooltip={`Persentase menunjukkan kontribusi ${topChannel.label} dibandingkan total ${totalVolume} tiket pada periode ${period === "daily" ? "hari ini" : "bulan ini"}.`}
                />
              </div>

              {!hasData ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  Belum ada data tiket untuk periode ini.
                </div>
              ) : period === "daily" ? (
                <ChannelBarChart counters={counters} />
              ) : trend.length > 0 ? (
                <MonthlyTrendChart trend={trend} />
              ) : (
                <ChannelBarChart counters={counters} />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function HomePage() {
  const { loading: isAuthLoading, user } = useAuth();
  const isAuthenticated = Boolean(user);
  const {
    articles: loadedArticles,
    errorMsg,
    isErrorArticles,
    isLoadingArticles,
  } = useArticles({ enabled: !isAuthLoading && isAuthenticated });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState(() => getLastSelectedSopId());
  const [customerName, setCustomerName] = useState("");
  const [customerGreeting, setCustomerGreeting] = useState("");
  const [copiedStepId, setCopiedStepId] = useState("");
  const [deleteTargetArticle, setDeleteTargetArticle] = useState(null);
  const [frequentlyUsedSops, setFrequentlyUsedSops] = useState([]);
  const [isDeletingArticle, setIsDeletingArticle] = useState(false);
  const [sopMode, setSopMode] = useState("detail");
  const searchInputRef = useRef(null);
  const searchPulseTimeoutRef = useRef(null);
  const searchPulseCleanupTimeoutRef = useRef(null);
  const lastPulsedSearchKeyRef = useRef("");
  const userCanManageSop = useMemo(() => canManageSop(user), [user]);
  const userIsSuperAdmin = useMemo(() => isSuperAdminUser(user), [user]);

  const articles = useMemo(
    () => (Array.isArray(loadedArticles) ? loadedArticles : []),
    [loadedArticles],
  );
  const frequentlyUsedCountMap = useMemo(() => {
    const countMap = new Map();

    if (!isAuthenticated) return countMap;

    frequentlyUsedSops.forEach((item) => {
      const sopId = item?.id || getSopId(item?.sop);
      const copyCount = Number(item?.count) || 0;
      if (!sopId || copyCount <= 0) return;

      countMap.set(sopId, copyCount);
    });

    return countMap;
  }, [frequentlyUsedSops, isAuthenticated]);
  const searchQuery = searchInput.trim();

  const filteredArticles = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase();
    const searchableArticles = normalizedSearch
      ? articles.filter((article) => getSearchableText(article).includes(normalizedSearch))
      : articles;

    return [...searchableArticles].sort((firstArticle, secondArticle) => {
      const firstCount = frequentlyUsedCountMap.get(getSopId(firstArticle)) || 0;
      const secondCount = frequentlyUsedCountMap.get(getSopId(secondArticle)) || 0;

      if (firstCount !== secondCount) return secondCount - firstCount;
      return articles.indexOf(firstArticle) - articles.indexOf(secondArticle);
    });
  }, [articles, frequentlyUsedCountMap, searchQuery]);

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
  const visibleSopMode = sopMode === "decision" && !userCanManageSop ? "detail" : sopMode;

  const handleSelectArticle = useCallback((sopId) => {
    if (!sopId) return;
    saveLastSelectedSopId(sopId);
    setSelectedArticleId(sopId);
    setSopMode("detail");
  }, []);

  const handleDecisionManualSearch = useCallback(() => {
    setSopMode("detail");
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const handleOpenDecisionSop = useCallback(
    (sopId) => {
      if (!sopId) {
        showToast("ID SOP dari decision belum tersedia.", "error");
        return;
      }

      const sopExists = articles.some((article) => getSopId(article) === sopId);

      if (!sopExists) {
        showToast("SOP hasil decision belum ada di daftar SOP yang dimuat.", "error");
        return;
      }

      handleSelectArticle(sopId);
      setSopMode("detail");
    },
    [articles, handleSelectArticle, showToast],
  );

  const loadFrequentlyUsedSops = useCallback(async () => {
    if (!isAuthenticated) {
      setFrequentlyUsedSops([]);
      return;
    }

    try {
      const frequentlyUsedData = await sopUsageService.getFrequentlyUsed();
      setFrequentlyUsedSops(frequentlyUsedData);
    } catch (error) {
      console.warn("Gagal memuat urutan SOP populer.", error);
      setFrequentlyUsedSops([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isActive = true;

    if (!isAuthenticated) {
      return undefined;
    }

    sopUsageService
      .getFrequentlyUsed()
      .then((frequentlyUsedData) => {
        if (isActive) {
          setFrequentlyUsedSops(frequentlyUsedData);
        }
      })
      .catch((error) => {
        if (isActive) {
          console.warn("Gagal memuat urutan SOP populer.", error);
          setFrequentlyUsedSops([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

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

  useEffect(() => {
    window.clearTimeout(searchPulseTimeoutRef.current);
    window.clearTimeout(searchPulseCleanupTimeoutRef.current);

    if (!searchQuery || isLoadingArticles || isErrorArticles || !filteredArticles.length) {
      lastPulsedSearchKeyRef.current = "";
      return undefined;
    }

    const searchKey = `${searchQuery}::${visibleSelectedArticleId}::${filteredArticles.length}`;

    if (lastPulsedSearchKeyRef.current === searchKey) {
      return undefined;
    }

    searchPulseTimeoutRef.current = window.setTimeout(() => {
      const firstHighlight = document.querySelector(`.${SEARCH_HIGHLIGHT_MARK_CLASS}`);

      if (!firstHighlight) return;

      firstHighlight.classList.remove(SEARCH_HIGHLIGHT_PULSE_CLASS);

      const shouldScroll = !isElementInViewport(firstHighlight);

      if (shouldScroll) {
        firstHighlight.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }

      window.setTimeout(() => {
        firstHighlight.classList.add(SEARCH_HIGHLIGHT_PULSE_CLASS);

        searchPulseCleanupTimeoutRef.current = window.setTimeout(() => {
          firstHighlight.classList.remove(SEARCH_HIGHLIGHT_PULSE_CLASS);
        }, 500);
      }, shouldScroll ? 380 : 0);

      lastPulsedSearchKeyRef.current = searchKey;
    }, 320);

    return () => {
      window.clearTimeout(searchPulseTimeoutRef.current);
      window.clearTimeout(searchPulseCleanupTimeoutRef.current);
    };
  }, [
    filteredArticles.length,
    isErrorArticles,
    isLoadingArticles,
    searchQuery,
    visibleSelectedArticleId,
  ]);

  const handleCopyTemplate = async (template, stepId, idSop) => {
    try {
      await writeClipboardText(template);
      setCopiedStepId(stepId);
      showToast("Template chat berhasil disalin.", "success");
      sopUsageService
        .logCopy(idSop)
        .then(() => loadFrequentlyUsedSops())
        .catch((error) => {
          console.warn("Gagal mencatat copy SOP.", error);
        });

      window.setTimeout(() => {
        setCopiedStepId((currentStepId) => (currentStepId === stepId ? "" : currentStepId));
      }, 1600);
    } catch {
      showToast(ARTICLE_MESSAGES.copyFailed, "error");
    }
  };

  const handleCustomerNameChange = useCallback((value) => {
    setCustomerName(toTitleCaseName(value));
  }, []);

  const handleCopyCustomerName = async () => {
    const nameToCopy = customerName.trim();

    if (!nameToCopy) {
      showToast("Nama user masih kosong.", "error");
      return;
    }

    try {
      await writeClipboardText(nameToCopy);
      showToast("Nama user berhasil disalin.", "success");
    } catch {
      showToast("Gagal menyalin nama user.", "error");
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
      const nextArticleId = nextArticle ? getSopId(nextArticle) : "";
      setSelectedArticleId(nextArticleId);
      if (nextArticleId) {
        saveLastSelectedSopId(nextArticleId);
      } else if (typeof window !== "undefined") {
        window.localStorage.removeItem(LAST_SELECTED_SOP_STORAGE_KEY);
      }
      setDeleteTargetArticle(null);
      showToast(ARTICLE_MESSAGES.deleteSuccess, "success");
      await queryClient.invalidateQueries({ queryKey: ["articles"] });
    } catch (error) {
      showToast(error?.message || ARTICLE_MESSAGES.deleteFailed, "error");
    } finally {
      setIsDeletingArticle(false);
    }
  };
  const isLoginRequired = !isAuthLoading && !isAuthenticated;
  const shouldShowArticleLoading = isAuthLoading || (isAuthenticated && isLoadingArticles);
  const shouldShowArticleError = isAuthenticated && isErrorArticles;
  const shouldShowArticleList =
    isAuthenticated && !isLoadingArticles && !isErrorArticles && filteredArticles.length > 0;

  return (
    <>
      <main className="min-h-[calc(100vh-4rem)] bg-slate-100 text-slate-950 lg:grid lg:grid-cols-[minmax(20rem,35%)_minmax(0,65%)] dark:bg-slate-950 dark:text-white">
        <aside className="border-r border-slate-200 bg-white lg:h-[calc(100vh-4rem)] lg:overflow-y-auto dark:border-slate-800 dark:bg-slate-950">
          <div className="sticky top-16 z-10 border-b border-slate-200 bg-white p-4 sm:p-5 lg:top-0 dark:border-slate-800 dark:bg-slate-950">
          <label className="block">
            <span className="sr-only">Ctrl + K</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="CTRL + K untuk mencari ..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20"
            />
          </label>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
          {shouldShowArticleLoading && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {isAuthLoading ? "Memeriksa sesi login..." : ARTICLE_MESSAGES.loadingList}
            </div>
          )}

          {isLoginRequired && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
              Silakan login untuk membuka daftar SOP.
            </div>
          )}

          {shouldShowArticleError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              Gagal memuat data: {errorMsg || "Sesi login sudah berakhir, silakan login kembali."}
            </div>
          )}

          {isAuthenticated && !isLoadingArticles && !isErrorArticles && filteredArticles.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {ARTICLE_MESSAGES.emptyList}
            </div>
          )}

          {shouldShowArticleList &&
            filteredArticles.map((article) => {
              const sopId = getSopId(article);

              return (
                <SopPreviewCard
                  key={sopId}
                  article={article}
                  isPopular={frequentlyUsedCountMap.has(sopId)}
                  isSelected={sopId === visibleSelectedArticleId}
                  onSelect={() => handleSelectArticle(sopId)}
                  searchQuery={searchQuery}
                />
              );
            })}
          </div>
        </aside>

        <section className="lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
        {isAuthenticated && !shouldShowArticleLoading && !shouldShowArticleError && (
          <SopModeTabs
            canShowDetailSop={userIsSuperAdmin}
            canUseDecisionAssistant={userCanManageSop}
            mode={visibleSopMode}
            onModeChange={setSopMode}
          />
        )}

        {shouldShowArticleLoading && (
          <EmptyWorkspace
            title={isAuthLoading ? "Memeriksa sesi" : "Memuat SOP"}
            message={isAuthLoading ? "Kami sedang mengecek sesi login Anda." : "Workspace akan tersedia setelah data selesai dimuat."}
          />
        )}

        {isLoginRequired && (
          <EmptyWorkspace
            title="Login Diperlukan"
            message="Masuk terlebih dahulu untuk membuka Buku SOP."
          />
        )}

        {!shouldShowArticleLoading && shouldShowArticleError && (
          <EmptyWorkspace
            title="Data SOP belum tersedia"
            message="Sesi login mungkin sudah berakhir. Silakan login kembali."
          />
        )}

        {isAuthenticated && userCanManageSop && !isLoadingArticles && !isErrorArticles && visibleSopMode === "decision" && (
          <DecisionAssistantMode
            articles={articles}
            onManualSearch={handleDecisionManualSearch}
            onOpenSop={handleOpenDecisionSop}
          />
        )}

        {isAuthenticated && !isLoadingArticles && !isErrorArticles && visibleSopMode === "detail" && !selectedArticle && (
          <EmptyWorkspace
            title="SOP tidak ditemukan"
            message="Coba gunakan kata kunci lain pada panel pencarian."
          />
        )}

        {isAuthenticated && !isLoadingArticles && !isErrorArticles && visibleSopMode === "detail" && selectedArticle && (
          <SopWorkspace
            article={selectedArticle}
            canManage={userCanManageSop}
            copiedStepId={copiedStepId}
            customerGreeting={customerGreeting}
            customerName={customerName}
            isDeleting={isDeletingArticle && getSopId(deleteTargetArticle) === getSopId(selectedArticle)}
            onEdit={() => handleEditArticle(selectedArticle)}
            onCopyCustomerName={handleCopyCustomerName}
            onCopyTemplate={handleCopyTemplate}
            onCustomerGreetingChange={setCustomerGreeting}
            onCustomerNameChange={handleCustomerNameChange}
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
      {isAuthenticated && <FloatingDrawerCounter />}
      {isAuthenticated && <QuickNotesDrawer />}
      <AuthModal
        canClose={false}
        isOpen={isLoginRequired}
        message="Sesi login diperlukan untuk membuka Buku SOP."
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
    to: "/admin/dashboard",
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

function AdminProtectedRoute({ children }) {
  const { loading } = useAuth();
  const sessionQuery = useQuery({
    queryKey: ["auth", "admin-route-session"],
    enabled: !loading,
    queryFn: () => authService.getCurrentUser(),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const currentUser = sessionQuery.data;

  if (loading || sessionQuery.isLoading || sessionQuery.isFetching) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Memeriksa hak akses...
        </div>
      </main>
    );
  }

  if (sessionQuery.isError || !canAccessAdminRoute(currentUser)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PasswordChangeRequiredGuard() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (!loading && isPasswordChangeRequired(user) && location.pathname !== "/cek-me") {
    return <Navigate to="/cek-me" replace />;
  }

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <PasswordChangeRequiredGuard />
      <Routes>
        <Route path="/" element={<HomePage />} /> 
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/edit/:id" element={<EditPage />} />
        <Route path="/sop/:id/edit" element={<EditPage />} />
        <Route
          path="/admin/sop"
          element={
            <AdminProtectedRoute>
              <AdminSOPPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboardPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/cek-me" element={<CekMe />} />
        <Route path="/links" element={<ImportantLinksPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
