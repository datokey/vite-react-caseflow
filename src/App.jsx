import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import CreateArticlePage from "./pages/CreateArticlePage";
import EditPage from "./pages/EditPage";
import AdminSOPPage from "./pages/AdminSOPPage";
import { useArticles } from "./hooks/useArticles";
import { useToast } from "./hooks/useToast";
import { ARTICLE_MESSAGES } from "./lib/articleConstants";

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

function SopWorkspace({
  article,
  copiedStepId,
  customerName,
  onCopyTemplate,
  onCustomerNameChange,
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
    <article className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
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

          <label className="w-full xl:max-w-sm">
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
      </div>
    </div>
  );
}

function HomePage() {
  const { articles: loadedArticles, errorMsg, isErrorArticles, isLoadingArticles } = useArticles();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [copiedStepId, setCopiedStepId] = useState("");
  const searchInputRef = useRef(null);

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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 lg:grid lg:grid-cols-[minmax(20rem,35%)_minmax(0,65%)]">
      <aside className="border-r border-slate-200 bg-white lg:h-screen lg:overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4 sm:p-5">
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

      <section className="lg:h-screen lg:overflow-y-auto">
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
            copiedStepId={copiedStepId}
            customerName={customerName}
            onCopyTemplate={handleCopyTemplate}
            onCustomerNameChange={setCustomerName}
          />
        )}
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateArticlePage />} />
        <Route path="/edit/:id" element={<EditPage />} />
        <Route path="/admin/sop" element={<AdminSOPPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
