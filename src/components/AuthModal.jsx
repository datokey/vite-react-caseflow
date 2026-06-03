import Login from "./Login.jsx";

function XIcon() {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export default function AuthModal({ canClose = true, isOpen, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
      {canClose && (
        <button
          type="button"
          aria-label="Tutup modal login"
          className="absolute inset-0"
          onClick={onClose}
        />
      )}

      <div className="relative z-10 my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup form login"
            className="absolute right-4 top-4 z-20 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <XIcon />
          </button>
        )}

        {message && (
          <div className="mx-4 mt-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
            {message}
          </div>
        )}

        <Login setCloseModal={onClose} />
      </div>
    </div>
  );
}
