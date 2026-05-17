import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        Memuat status . . . .
      </nav>
    );
  }

  
  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4 relative">
        <div className="text-2xl font-bold text-indigo-600 tracking-tight">
          Nulis<span className="text-slate-800">Kode</span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-indigo-600 transition">Link Penting</a>
          <a href="#" className="hover:text-indigo-600 transition">Kategori</a>
          <a href="#" className="hover:text-indigo-600 transition">Update</a>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden md:inline-flex bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-indigo-700 transition">
            Login
          </button>

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
              <a href="#" onClick={() => setIsOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-slate-100 transition">
                Link Penting
              </a>
              <a href="#" onClick={() => setIsOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-slate-100 transition">
                Kategori
              </a>
              <a href="#" onClick={() => setIsOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-slate-100 transition">
                Update
              </a>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-indigo-700 transition"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar
