import { useEffect, useRef, useState } from "react";
import { useToast } from "../hooks/useToast";

const STORAGE_KEY = "quickNotes";
const LEGACY_STORAGE_KEY = "quickNotesByUserTab";
const STORAGE_WIDTH_KEY = "quickNotesDrawerWidth";
const DEFAULT_DRAWER_WIDTH = 448;
const MIN_DRAWER_WIDTH = 320;

const getMaxDrawerWidth = () =>
  typeof window === "undefined" ? 704 : Math.max(MIN_DRAWER_WIDTH, Math.floor(window.innerWidth * 0.7));

const loadStoredNotes = () => {
  if (typeof window === "undefined") return "";

  try {
    const currentNote = window.localStorage.getItem(STORAGE_KEY);
    if (typeof currentNote === "string") return currentNote;

    const legacyNotes = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) || "{}");
    if (legacyNotes && typeof legacyNotes === "object") {
      return legacyNotes.user1 || legacyNotes.user2 || legacyNotes.user3 || "";
    }

    return "";
  } catch {
    return "";
  }
};

const loadStoredDrawerWidth = () => {
  if (typeof window === "undefined") return DEFAULT_DRAWER_WIDTH;

  const storedWidth = Number(window.localStorage.getItem(STORAGE_WIDTH_KEY));
  if (!Number.isFinite(storedWidth)) return DEFAULT_DRAWER_WIDTH;
  return Math.min(getMaxDrawerWidth(), Math.max(MIN_DRAWER_WIDTH, storedWidth));
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
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState(loadStoredNotes);
  const [drawerWidth, setDrawerWidth] = useState(loadStoredDrawerWidth);
  const textareaRef = useRef(null);
  const isResizingRef = useRef(false);
  const hasAnyNote = Boolean(note.trim());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, note);
  }, [note]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_WIDTH_KEY, String(drawerWidth));
  }, [drawerWidth]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!isResizingRef.current) return;

      const maxWidth = getMaxDrawerWidth();
      const newWidth = Math.max(
        MIN_DRAWER_WIDTH,
        Math.min(maxWidth, window.innerWidth - event.clientX),
      );

      setDrawerWidth(newWidth);
    };

    const stopResize = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", stopResize);
    document.addEventListener("pointercancel", stopResize);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", stopResize);
      document.removeEventListener("pointercancel", stopResize);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimeout = window.setTimeout(() => textareaRef.current?.focus(), 150);
    return () => window.clearTimeout(focusTimeout);
  }, [isOpen]);

  const handleNoteChange = (event) => {
    setNote(event.target.value);
  };

  const handleCopyAll = async () => {
    if (!note.trim()) {
      showToast("Catatan masih kosong.", "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(note);
      showToast("Catatan berhasil disalin.", "success");
    } catch {
      showToast("Gagal menyalin catatan.", "error");
    }
  };

  const handleClear = () => {
    if (!note.trim()) return;

    const confirmed = window.confirm("Hapus catatan cepat ini?");
    if (!confirmed) return;

    setNote("");
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
          className={`absolute right-0 top-0 flex h-full flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950 ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
          style={{ width: drawerWidth, minWidth: MIN_DRAWER_WIDTH, maxWidth: "100%" }}
          aria-label="Catatan Cepat"
        >
          <button
            type="button"
            aria-label="Ubah ukuran drawer catatan cepat"
            onPointerDown={(event) => {
              event.preventDefault();
              isResizingRef.current = true;
            }}
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          />
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
          <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
            <textarea
              ref={textareaRef}
              value={note}
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
