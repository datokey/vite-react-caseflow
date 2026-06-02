// src/components/Footer.jsx
const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 mt-20 dark:border-slate-800 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="text-xl font-bold text-indigo-600 mb-4">NulisKode</div>
          <p className="text-slate-500 text-sm dark:text-slate-400">Platform berbagi ilmu seputar pemrograman dan teknologi modern.</p>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 mb-4 dark:text-white">Link Cepat</h4>
          <ul className="text-slate-500 text-sm space-y-2 dark:text-slate-400">
            <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-300">Terpopuler</a></li>
            <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-300">Tutorial React</a></li>
            <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-300">Tips Karir</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 mb-4 dark:text-white">Ikuti Kami</h4>
          <div className="flex space-x-4">
            <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-indigo-100 transition cursor-pointer dark:bg-slate-800 dark:hover:bg-indigo-500/20"></div>
            <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-indigo-100 transition cursor-pointer dark:bg-slate-800 dark:hover:bg-indigo-500/20"></div>
            <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-indigo-100 transition cursor-pointer dark:bg-slate-800 dark:hover:bg-indigo-500/20"></div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-slate-50 text-center text-slate-400 text-xs dark:border-slate-800 dark:text-slate-500">
        © 2024 NulisKode. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
