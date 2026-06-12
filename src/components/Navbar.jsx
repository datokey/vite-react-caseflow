import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import AuthModal from "./AuthModal.jsx";
import ScreenWakeLockButton from "./ScreenWakeLockButton.jsx";
import { TiFlowChildren } from "react-icons/ti";

const PRIMARY_LINKS = [
  { label: "Beranda", to: "/" },
  { label: "Statistik Kerja", to: "/analytics" },
];

const ADMIN_LINKS = [
  { label: "Dashboard Admin", to: "/admin/dashboard", adminOnly: true },
  { label: "Buat SOP", to: "/admin/sop", adminOnly: true },
];

const getDisplayName = (user) =>
  user?.username || user?.name || user?.email || "Pengguna";

const normalizeRoleLabel = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const getRoleText = (value) => {
  if (!value || typeof value !== "object") return String(value || "").trim();
  return (
    value.role || value.name || value.value || value.title || value.label || ""
  );
};

const canAccessAdminMenu = (user) => {
  if (!user) return false;
  if (user.isAdmin || user.isSuperAdmin || user.is_admin || user.is_super_admin)
    return true;

  const roleSources = [
    user.role,
    user.userRole,
    user.roleName,
    user.type,
    user.accessLevel,
    ...(Array.isArray(user.roles) ? user.roles : []),
  ];

  return roleSources
    .map(getRoleText)
    .map(normalizeRoleLabel)
    .some((role) => ["admin", "super_admin", "superadmin"].includes(role));
};

const navLinkClass = ({ isActive }) =>
  [
    "inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold transition",
    "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
    isActive
      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
  ].join(" ");

const mobileLinkClass = ({ isActive }) =>
  [
    "block rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
    isActive
      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  ].join(" ");

function ChevronIcon({ isOpen }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MenuIcon({ isOpen }) {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isOpen ? (
        <path d="M18 6 6 18M6 6l12 12" />
      ) : (
        <path d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SunIcon() {
  return (
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
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
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

const Navbar = () => {
  const navigate = useNavigate();
  const { loading, user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const adminMenuRef = useRef(null);
  const userCanAccessAdmin = canAccessAdminMenu(user);
  const visibleAdminLinks = ADMIN_LINKS.filter(
    (link) => !link.adminOnly || userCanAccessAdmin,
  );

  const closeMenus = () => {
    setIsMobileOpen(false);
    setIsAdminOpen(false);
  };

  const openLogin = () => {
    closeMenus();
    setIsLoginOpen(true);
  };

  const handleLogout = async () => {
    closeMenus();
    await logout();
    showToast("Anda berhasil keluar.", "success");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(event.target)
      ) {
        setIsAdminOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeMenus();
        setIsLoginOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (loading) {
    return (
      <nav className="sticky top-0 z-50 h-16 border-b border-slate-200 bg-white/95 px-4 text-sm text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400">
        <div className="flex h-full w-full items-center justify-between">
          <span>Memuat status...</span>
          <div className="flex items-center gap-2">
            <ScreenWakeLockButton />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDarkMode ? "Aktifkan light mode" : "Aktifkan dark mode"
              }
              data-testid="theme-toggle-loading"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            onClick={closeMenus}
            className="inline-flex items-center gap-2 text-xl font-black text-indigo-600 dark:text-indigo-300 md:flex-1"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/25 dark:bg-indigo-500 dark:shadow-indigo-900/40">
        <TiFlowChildren className="h-5 w-5 text-white" />
      </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Case
              <span className="text-indigo-600 dark:text-indigo-300">Flow</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {PRIMARY_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={navLinkClass}
                end={link.to === "/"}
              >
                {link.label}
              </NavLink>
            ))}

            {userCanAccessAdmin && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isAdminOpen}
                  onClick={() =>
                    setIsAdminOpen((currentValue) => !currentValue)
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus:ring-offset-slate-950"
                >
                  Admin
                  <ChevronIcon isOpen={isAdminOpen} />
                </button>

                <div
                  role="menu"
                  className={`absolute right-0 top-full mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
                    isAdminOpen
                      ? "visible translate-y-0 opacity-100"
                      : "invisible -translate-y-2 opacity-0"
                  }`}
                >
                  <div className="mb-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    Masuk sebagai{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {getDisplayName(user)}
                    </span>
                  </div>

                  {visibleAdminLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      role="menuitem"
                      onClick={closeMenus}
                      className={mobileLinkClass}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden items-center gap-2 md:flex md:flex-1 md:justify-end">
            <ScreenWakeLockButton />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDarkMode ? "Aktifkan light mode" : "Aktifkan dark mode"
              }
              data-testid="theme-toggle-desktop"
              title={isDarkMode ? "Light mode" : "Dark mode"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white dark:focus:ring-offset-slate-950"
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            {user ? (
              <>
                <Link
                  to="/cek-me"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <UserIcon />
                  <span className="max-w-36 truncate">
                    {getDisplayName(user)}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-10 items-center rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10 dark:focus:ring-offset-slate-950"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus:ring-offset-slate-950"
              >
                Login
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ScreenWakeLockButton />
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileOpen}
              onClick={() => setIsMobileOpen((currentValue) => !currentValue)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <MenuIcon isOpen={isMobileOpen} />
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden border-t border-slate-100 bg-white transition-all duration-200 md:hidden dark:border-slate-800 dark:bg-slate-950 ${
            isMobileOpen ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-1 px-4 py-3">
            {PRIMARY_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={mobileLinkClass}
                end={link.to === "/"}
                onClick={closeMenus}
              >
                {link.label}
              </NavLink>
            ))}

            {userCanAccessAdmin && (
              <>
                <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

                <p className="px-3 pb-1 text-xs font-bold uppercase text-slate-400">
                  Admin
                </p>
                {visibleAdminLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={mobileLinkClass}
                    onClick={closeMenus}
                  >
                    {link.label}
                  </NavLink>
                ))}
              </>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDarkMode ? "Aktifkan light mode" : "Aktifkan dark mode"
              }
              data-testid="theme-toggle-mobile"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>

            {user ? (
              <>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Halo,{" "}
                  <span className="font-semibold">{getDisplayName(user)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className="block w-full rounded-lg bg-indigo-600 px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      <AuthModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
};

export default Navbar;
