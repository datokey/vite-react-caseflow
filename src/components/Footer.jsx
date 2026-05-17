// src/components/Footer.jsx
const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 py-12 mt-20">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="text-xl font-bold text-indigo-600 mb-4">NulisKode</div>
          <p className="text-slate-500 text-sm">Platform berbagi ilmu seputar pemrograman dan teknologi modern.</p>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 mb-4">Link Cepat</h4>
          <ul className="text-slate-500 text-sm space-y-2">
            <li><a href="#" className="hover:text-indigo-600">Terpopuler</a></li>
            <li><a href="#" className="hover:text-indigo-600">Tutorial React</a></li>
            <li><a href="#" className="hover:text-indigo-600">Tips Karir</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 mb-4">Ikuti Kami</h4>
          <div className="flex space-x-4">
            <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-indigo-100 transition cursor-pointer"></div>
            <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-indigo-100 transition cursor-pointer"></div>
            <div className="w-8 h-8 bg-slate-100 rounded-full hover:bg-indigo-100 transition cursor-pointer"></div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-12 pt-8 border-t border-slate-50 text-center text-slate-400 text-xs">
        © 2024 NulisKode. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;