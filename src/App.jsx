import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "./components/Navbar"; 
import EditPage from "./pages/EditPage";
import AdminSOPPage from "./pages/AdminSOPPage";
import CekMe from "./pages/cekMe";
import { useAuth } from "./hooks/useAuth";
import { useArticles } from "./hooks/useArticles";
import { useToast } from "./hooks/useToast";
import { ARTICLE_MESSAGES, ARTICLE_ROUTES } from "./lib/articleConstants";
import { articleService } from "./services/articleService";

const CATEGORY_ACCENTS = [
  "#0ea5e9",
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ef4444",
  "#14b8a6",
];

const NAME_PLACEHOLDER = "Nama Pelanggan";
const TEMPLATE_NAME_PATTERN =
  /\{\{\s*(nama|nama_pelanggan|namaPelanggan|customerName|customer_name|pelanggan)\s*\}\}|\{\s*(nama|nama_pelanggan|namaPelanggan|customerName|customer_name|pelanggan)\s*\}|\[\s*(nama|nama pelanggan|customer name|customerName|customer_name|pelanggan)\s*\]|<<\s*(nama|nama pelanggan|customer name|customerName|customer_name|pelanggan)\s*>>/gi;

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

const getDisplayDate = (date) => {
  const rawDate = toText(date);
  if (!rawDate) return "-";

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) return rawDate;

  return parsedDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getCategory = (article) =>
  toText(
    getFirstValue(article?.details, ["JenisLog", "jenisLog", "kategori", "Kategori"]) ||
      article?.category ||
      article?.kategori,
  ) || "SOP Operasional";

const getCategoryAccent = (category) => {
  const hash = category.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return CATEGORY_ACCENTS[hash % CATEGORY_ACCENTS.length];
};

const getConditions = (article) =>
  toTextList(getFirstValue(article?.details, ["Kondisi", "kondisi", "conditions", "condition"]));

const normalizeHandlingSteps = (article) => {
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
      const instructions = toTextList(
        getFirstValue(step, [
          "instruksiInternal",
          "instruksi",
          "instructions",
          "langkah",
          "steps",
          "checklist",
        ]),
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
        instructions,
        templateChat,
      };
    })
    .filter((step) => step.title || step.instructions.length || step.templateChat);
};

const getWarnings = (article) =>
  toTextList(
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
    ]),
  );

const fillTemplate = (template, customerName) => {
  const replacement = customerName.trim() || NAME_PLACEHOLDER;
  return template.replace(TEMPLATE_NAME_PATTERN, replacement);
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
    ...normalizeHandlingSteps(article).flatMap((step) => [
      step.title,
      ...step.instructions,
      step.templateChat,
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

function SopPreviewCard({ article, isSelected, onSelect }) {
  const category = getCategory(article);
  const conditions = getConditions(article);
  const handlingSteps = normalizeHandlingSteps(article);
  const keywordLabels = getKeywordLabels(article);
  const accentColor = getCategoryAccent(category);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-l-4 border-y border-r p-4 text-left transition ${
        isSelected
          ? "border-y-slate-300 border-r-slate-300 bg-slate-100 shadow-sm"
          : "border-y-slate-200 border-r-slate-200 bg-white hover:bg-slate-50"
      } rounded-lg`}
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-slate-500">{category}</p>
        <h2 className="line-clamp-2 text-base font-bold leading-snug text-slate-950">
          {article?.title || "Tanpa judul SOP"}
        </h2>
        <p className="text-sm text-slate-500">
          {conditions.length} kondisi / {handlingSteps.length} penanganan
        </p>
        {keywordLabels.length > 0 && (
          <p className="line-clamp-1 text-xs text-slate-400">
            {keywordLabels.join(", ")}
          </p>
        )}
      </div>
    </button>
  );
}

function TemplateChatBox({ template, stepId, copiedStepId, customerName, onCopy }) {
  const filledTemplate = fillTemplate(template, customerName);
  const isCopied = copiedStepId === stepId;

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-700">Template chat</p>
        <button
          type="button"
          onClick={() => onCopy(filledTemplate, stepId)}
          className="w-full rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:w-auto"
        >
          {isCopied ? "Tersalin" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-slate-700">
        {filledTemplate}
      </p>
    </div>
  );
}

function TimelineStep({ step, index, copiedStepId, customerName, onCopy }) {
  return (
    <div className="relative pb-8 last:pb-0">
      <div className="absolute -left-[2.15rem] top-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white ring-4 ring-slate-50">
        {index + 1}
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Tahap {index + 1}</p>
          <h3 className="mt-1 text-lg font-bold leading-tight text-slate-950">{step.title}</h3>
        </div>

        {step.instructions.length > 0 && (
          <ul className="space-y-2">
            {step.instructions.map((instruction, instructionIndex) => (
              <li
                key={`${step.id}-instruction-${instructionIndex}`}
                className="flex gap-3 text-sm leading-6 text-slate-700"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        )}

        {step.templateChat && (
          <TemplateChatBox
            template={step.templateChat}
            stepId={step.id}
            copiedStepId={copiedStepId}
            customerName={customerName}
            onCopy={onCopy}
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
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
          className={`absolute right-0 top-full z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl transition-all duration-150 ${
            isMenuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
          }`}
        >
          <button
            type="button"
            role="menuitem"
            disabled={isDeleting}
            onClick={handleDeleteClick}
            className="block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
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
  customerName,
  isDeleting,
  onEdit,
  onCopyTemplate,
  onCustomerNameChange,
  onRequestDelete,
}) {
  const category = getCategory(article);
  const conditions = getConditions(article);
  const handlingSteps = normalizeHandlingSteps(article);
  const warnings = getWarnings(article);
  const keywordLabels = getKeywordLabels(article);
  const authorName = getAuthorName(article);
  const sopId = getSopId(article);
  const accentColor = getCategoryAccent(category);

  return (
    <article className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase text-slate-500">{category}</p>
              <h1 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                {article?.title || "Tanpa judul SOP"}
              </h1>
              {article?.content && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {article.content}
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

          <div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase text-slate-500">Author</dt>
                <dd className="mt-1 font-semibold text-slate-800">{authorName}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase text-slate-500">Dibuat</dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {getDisplayDate(article?.createdAt)}
                </dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase text-slate-500">ID SOP</dt>
                <dd className="mt-1 truncate font-mono text-xs text-slate-700">{sopId || "-"}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold uppercase text-slate-500">Versi</dt>
                <dd className="mt-1 font-semibold text-slate-800">
                  {article?.__v ?? "-"}
                </dd>
              </div>
            </dl>
            {keywordLabels.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {keywordLabels.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="block w-full xl:max-w-sm">
            <span className="text-sm font-semibold text-slate-700">Nama pelanggan</span>
            <input
              type="text"
              value={customerName}
              onChange={(event) => onCustomerNameChange(event.target.value)}
              placeholder={NAME_PLACEHOLDER}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
      </header>

      <div className="px-5 py-6 sm:px-8">
        <section className="border-b border-slate-200 pb-6">
          <div
            className="mb-4 border-l-4 pl-4"
            style={{ borderLeftColor: accentColor }}
          >
            <h2 className="text-lg font-bold text-slate-950">Kondisi</h2>
          </div>

          {conditions.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {conditions.map((condition, index) => (
                <li
                  key={`${getSopId(article)}-condition-${index}`}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                >
                  {condition}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
              Belum ada kondisi yang tercatat.
            </p>
          )}
        </section>

        <section className="border-b border-slate-200 py-6">
          <h2 className="mb-6 text-lg font-bold text-slate-950">Alur Penanganan</h2>

          {handlingSteps.length > 0 ? (
            <div className="relative ml-4 border-l border-slate-300 pl-8">
              {handlingSteps.map((step, index) => (
                <TimelineStep
                  key={step.id}
                  step={step}
                  index={index}
                  copiedStepId={copiedStepId}
                  customerName={customerName}
                  onCopy={onCopyTemplate}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
              Belum ada alur penanganan yang tercatat.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950">
          <h2 className="text-base font-bold">Catatan / Warning</h2>
          {warnings.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {warnings.map((warning, index) => (
                <li key={`${getSopId(article)}-warning-${index}`} className="text-sm leading-6">
                  {warning}
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
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
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
        className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
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
            <h2 id="delete-sop-title" className="text-lg font-black text-slate-950">
              Hapus SOP
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Apakah Anda yakin ingin menghapus SOP ini?
            </p>
            <p className="mt-2 truncate text-sm font-semibold text-slate-950">
              {article?.title || "Tanpa judul SOP"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
  const [copiedStepId, setCopiedStepId] = useState("");
  const [deleteTargetArticle, setDeleteTargetArticle] = useState(null);
  const [isDeletingArticle, setIsDeletingArticle] = useState(false);
  const searchInputRef = useRef(null);
  const userCanManageSop = useMemo(() => canManageSop(user), [user]);

  const articles = useMemo(
    () => (Array.isArray(loadedArticles) ? loadedArticles : []),
    [loadedArticles],
  );

  const filteredArticles = useMemo(() => {
    const normalizedSearch = searchInput.trim().toLowerCase();

    if (!normalizedSearch) return articles;

    return articles.filter((article) => getSearchableText(article).includes(normalizedSearch));
  }, [articles, searchInput]);

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
      <main className="min-h-[calc(100vh-4rem)] bg-slate-100 text-slate-950 lg:grid lg:grid-cols-[minmax(20rem,35%)_minmax(0,65%)]">
        <aside className="border-r border-slate-200 bg-white lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="sticky top-16 z-10 border-b border-slate-200 bg-white p-4 sm:p-5 lg:top-0">
          <label className="block">
            <span className="sr-only">Cari SOP</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari SOP..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </label>
          </div>

          <div className="space-y-3 p-4 sm:p-5">
          {isLoadingArticles && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">
              {ARTICLE_MESSAGES.loadingList}
            </div>
          )}

          {isErrorArticles && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
              Gagal memuat data: {errorMsg}
            </div>
          )}

          {!isLoadingArticles && !isErrorArticles && filteredArticles.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
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
            customerName={customerName}
            isDeleting={isDeletingArticle && getSopId(deleteTargetArticle) === getSopId(selectedArticle)}
            onEdit={() => handleEditArticle(selectedArticle)}
            onCopyTemplate={handleCopyTemplate}
            onCustomerNameChange={setCustomerName}
            onRequestDelete={() => handleRequestDeleteArticle(selectedArticle)}
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
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase text-indigo-600">Navigasi Cepat</p>
          <h1 className="mt-2 text-3xl font-black">Link Penting</h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {IMPORTANT_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-sm"
            >
              <h2 className="font-bold text-slate-950">{link.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{link.description}</p>
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
