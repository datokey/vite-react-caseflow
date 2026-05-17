const Navbar = () => {
  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
    <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="text-2xl font-bold text-indigo-600 tracking-tight">
          Nulis<span className="text-slate-800">Kode</span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-indigo-600 transition">Link Penting</a>
          <a href="#" className="hover:text-indigo-600 transition">Kategori</a>
          <a href="#" className="hover:text-indigo-600 transition">Update</a>
        </div>
        <button className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-indigo-700 transition">
          Login
        </button>
      </div>
    </nav>
  )
}

export default Navbar