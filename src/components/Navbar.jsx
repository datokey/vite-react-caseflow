import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext.jsx";
import { useNavigate } from "react-router-dom";

import Login from "./Login.jsx";

const NAV_LINKS = [
  { label: "Link Penting", href: "#" },
  { label: "Kategori", href: "#" },
  { label: "Update", href: "#" }, 
];

const getDisplayName = (user) => user?.username || user?.name || user?.email || "Pengguna";

const Navbar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { loading, user, logout } = useAuth();
  const { showToast } = useToast();
  const profileMenuRef = useRef(null);

  const closeMenu = () => setIsOpen(false);
  const closeProfileMenu = () => setIsProfileOpen(false);

  const openLogin = () => {
    closeMenu();
    closeProfileMenu();
    setIsLoginOpen(true);
  };

  const handleLogout = async () => {
    closeMenu();
    closeProfileMenu();
    await logout();
    showToast("Anda berhasil keluar.", "success");
  };

  const handleProfileClick = () => {
    closeMenu();
    closeProfileMenu();
    navigate("/cek-me");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  if (loading) {
    return (
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 px-4 py-4 text-sm text-slate-500">
        Memuat status . . . .
      </nav>
    );
  }

  return (
    <>
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4 relative">
          <div className="text-2xl font-bold text-indigo-600 tracking-tight">
            Nulis<span className="text-slate-800">Kode</span>
          </div>

          <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-600">
            {NAV_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="hover:text-indigo-600 transition">
                {link.label}
              </a>
            ))}
          </div>
           
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  aria-label="Buka menu akun"
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>

                <button
                  type="button"
                  aria-label="Buka menu akun"
                  aria-haspopup="menu"
                  aria-expanded={isProfileOpen}
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className="md:hidden inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  <span className="truncate max-w-xs">{getDisplayName(user)}</span>
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {isProfileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-200"
                  >
                    <div className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">
                      Halo, <span className="font-semibold text-slate-900">{getDisplayName(user)}</span>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleProfileClick}
                      className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={openLogin}
                className="hidden md:inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700"
              >
                Masuk
              </button>
            )}

            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={isOpen}
              onClick={() => setIsOpen((prev) => !prev)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-700 hover:text-indigo-600 hover:bg-slate-100 transition md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {isOpen && (
            <div className="absolute left-4 right-4 top-full mt-2 rounded-3xl bg-white border border-slate-200 shadow-2xl p-4 md:hidden">
              <div className="flex flex-col gap-3 text-sm font-medium text-slate-700">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={closeMenu}
                    className="block rounded-xl px-3 py-2 hover:bg-slate-100 transition"
                  >
                    {link.label}
                  </a>
                ))}

                {user ? (
                  <>
                    <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      Halo, <span className="font-semibold text-slate-900">{getDisplayName(user)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleProfileClick}
                      className="w-full rounded-xl px-3 py-2 text-left hover:bg-slate-100 transition"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-xl px-3 py-2 text-left text-rose-600 font-semibold hover:bg-rose-50 transition"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openLogin}
                    className="w-full rounded-xl bg-indigo-600 px-3 py-2 text-white font-semibold hover:bg-indigo-700 transition"
                  >
                    Masuk
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsLoginOpen(false)}></div>

          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 z-10 p-2">
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              aria-label="Tutup form login"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            <Login setCloseModal={() => setIsLoginOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
