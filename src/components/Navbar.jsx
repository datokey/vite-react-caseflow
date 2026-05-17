import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Login from "./Login.jsx";

const NAV_LINKS = [
  { label: "Link Penting", href: "#" },
  { label: "Kategori", href: "#" },
  { label: "Update", href: "#" },
];

const AuthAction = ({ user, onLogin, onLogout, className = "" }) => {
  if (user) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <span className="text-sm text-slate-600 font-medium">
          Halo, <b className="text-slate-800">{user.username}</b>
        </span>
        <button
          onClick={onLogout}
          className="bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          Keluar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onLogin}
      className={`bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shadow-xs ${className}`}
    >
      Masuk
    </button>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { loading, user, logout } = useAuth();

  const closeMenu = () => setIsOpen(false);

  const openLogin = () => {
    closeMenu();
    setIsLoginOpen(true);
  };

  const handleLogout = () => {
    closeMenu();
    logout();
  };

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
            <AuthAction user={user} onLogin={openLogin} onLogout={handleLogout} className="hidden md:flex" />

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

                <AuthAction
                  user={user}
                  onLogin={openLogin}
                  onLogout={handleLogout}
                  className="w-full justify-center"
                />
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
              onClick={() => setIsLoginOpen(false)}
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
