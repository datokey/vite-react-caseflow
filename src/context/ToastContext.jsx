import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toastContext";

const TOAST_DURATION_MS = 3000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(1);

  const showToast = useCallback((message, variant = "info") => {
    const id = nextToastId.current++;

    setToasts((currentToasts) => [...currentToasts, { id, message, variant }]);

    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <style>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-16px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .toast-notification {
          animation: slideInFromTop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
      <div className="fixed top-20 right-4 z-50 flex flex-col items-end gap-3 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-sm rounded-3xl border px-4 py-3 text-sm font-medium shadow-xl toast-notification ${
              toast.variant === "success"
                ? "bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-700"
                : toast.variant === "error"
                ? "bg-rose-500 text-white border-rose-600 dark:bg-rose-600 dark:border-rose-700"
                : "bg-slate-900 text-white border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
