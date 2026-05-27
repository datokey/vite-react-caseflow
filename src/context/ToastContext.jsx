import { useCallback, useMemo, useRef, useState } from "react";
import { ToastContext } from "./toastContext";

const TOAST_DURATION_MS = 2000;

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
      <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-3 px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-sm rounded-3xl border px-4 py-3 text-sm font-medium shadow-xl transition duration-200 ${
              toast.variant === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-100"
                : toast.variant === "error"
                ? "bg-rose-50 text-rose-800 border-rose-100"
                : "bg-slate-900 text-white border-slate-800"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
