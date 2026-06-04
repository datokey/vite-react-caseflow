import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../hooks/useToast";

const STORAGE_KEY = "quickNotesByUserTab";
const NOTE_TABS = [
  { id: "user1", label: "User 1" },
  { id: "user2", label: "User 2" },
  { id: "user3", label: "User 3" },
];

const createEmptyNotes = () =>
  NOTE_TABS.reduce((notes, tab) => {
    notes[tab.id] = "";
    return notes;
  }, {});

const loadStoredNotes = () => {
  if (typeof window === "undefined") return createEmptyNotes();

  try {
    const parsedNotes = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...createEmptyNotes(),
      ...(parsedNotes && typeof parsedNotes === "object" ? parsedNotes : {}),
    };
  } catch {
    return createEmptyNotes();
  }
};

function NotesIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M4 6h16" />
      <path d="M6 4h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2Z" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export default function QuickNotesDrawer() {
  const { showToast } = useToast();
  const [activeTabId, setActiveTabId] = useState(NOTE_TABS[0].id);
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(loadStoredNotes);
  const textareaRef = useRef(null);
  const activeNote = notes[activeTabId] || "";
  const hasAnyNote = useMemo(
    () => NOTE_TABS.some((tab) => (notes[tab.id] || "").trim()),
    [notes],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimeout = window.setTimeout(() => textareaRef.current?.focus(), 150);
    return () => window.clearTimeout(focusTimeout);
  }, [activeTabId, isOpen]);

  const handleNoteChange = (event) => {
    const { value } = event.target;
    setNotes((currentNotes) => ({ ...currentNotes, [activeTabId]: value }));
  };

  const handleCopyAll = async () => {
    if (!activeNote.trim()) {
      showToast("Catatan masih kosong.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(activeNote);
      showToast("Catatan berhasil disalin.", "success");
    } catch {
      showToast("Gagal menyalin catatan.", "error");
    }
  };

  const handleClear = () => {
    if (!activeNote.trim()) return;

    const confirmed = window.confirm("Hapus catatan pada tab ini?");
    if (!confirmed) return;

    setNotes((currentNotes) => ({ ...currentNotes, [activeTabId]: "" }));
    showToast("Catatan berhasil dihapus.", "success");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Buka catatan cepat"
        className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-xl shadow-amber-500/30 transition hover:-translate-y-0.5 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300 dark:focus:ring-offset-slate-950"
      >
        <NotesIcon />
        {hasAnyNote && (
          <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950" />
        )}
      </button>

      <div
        className={`fixed inset-0 z-50 transition ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          aria-label="Tutup catatan cepat"
          onClick={() => setIsOpen(false)}
          className={`absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 sm:w-[28rem] ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          aria-label="Catatan Cepat"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <p className="text-xl font-black uppercase text-amber-600 dark:text-amber-300">Quick Notes</p>
             
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Tutup drawer catatan"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            {NOTE_TABS.map((tab) => {
              const isActive = activeTabId === tab.id;
              const hasContent = Boolean((notes[tab.id] || "").trim());

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`relative inline-flex h-9 flex-1 items-center justify-center rounded-lg px-3 text-sm font-bold transition ${
                    isActive
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab.label}
                  {hasContent && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
            <textarea
              ref={textareaRef}
              value={activeNote}
              onChange={handleNoteChange}
              placeholder="Tulis catatan cepat di sini..."
              className="min-h-0 flex-1 resize-none rounded-lg border border-amber-200 bg-yellow-50 p-4 text-sm leading-6 text-slate-900 shadow-inner outline-none transition placeholder:text-amber-700/50 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-amber-500/30 dark:bg-amber-200/10 dark:text-amber-50 dark:placeholder:text-amber-100/40 dark:focus:border-amber-300 dark:focus:ring-amber-300/20"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyAll}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Copy All
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-rose-200 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                Clear
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
