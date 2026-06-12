import { LuCoffee } from "react-icons/lu";
import { useScreenWakeLock } from "../hooks/useScreenWakeLock";
import { useToast } from "../hooks/useToast";

const WAKE_LOCK_TOOLTIP = "Biarkan layar tetap menyala";

export default function ScreenWakeLockButton({ className = "" }) {
  const { showToast } = useToast();
  const { isActive, isPending, toggleWakeLock } = useScreenWakeLock({
    onError: () => {
      showToast("Gagal mengaktifkan Screen Wake Lock.", "error");
    },
    onUnsupported: () => {
      showToast("Browser ini belum mendukung Screen Wake Lock.", "error");
    },
  });

  return (
    <div className={`group relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={toggleWakeLock}
        disabled={isPending}
        aria-busy={isPending}
        aria-label={WAKE_LOCK_TOOLTIP}
        aria-pressed={isActive}
        title={WAKE_LOCK_TOOLTIP}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:focus:ring-offset-slate-950 ${
          isActive
            ? "border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-500/10 hover:bg-indigo-100 dark:border-indigo-400/40 dark:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
            : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
        }`}
      >
        <LuCoffee className="h-5 w-5" fill={isActive ? "currentColor" : "none"} aria-hidden="true" />
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-56 translate-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 opacity-0 shadow-lg transition duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {WAKE_LOCK_TOOLTIP}
      </span>
    </div>
  );
}
