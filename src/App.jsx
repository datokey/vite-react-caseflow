import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './components/Navbar';
import ArticleCard from './components/ArticleCard';
import Footer from './components/Footer';

// Import custom hook yang sudah kita buat sebelumnya
import { useArticles } from './hooks/useArticles'; 

function App() {
  // 1. State untuk fitur pencarian
  const [searchInput, setSearchInput] = useState(""); 
  const [query, setQuery] = useState(""); // State ini yang akan mentrigger fetch ulang

  // 2. Mengambil data dari backend menggunakan Custom Hook React Query
  // Kita gunakan endpoint pencarian jika user memasukkan kata kunci
  const { articles, isLoadingArticles, isErrorArticles, errorMsg } = useArticles(
    query ? { search: query } : {}
  );

  // 3. Fungsi yang dijalankan saat tombol "Cari" diklik atau tekan Enter
  const handleSearch = () => {
    setQuery(searchInput.trim());
  };

  const formatedDate = (date) => {
    return new Date(date).toLocaleDateString("id-ID")
  }

  return (
    <BrowserRouter>
      <div className="bg-slate-50 min-h-screen">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-10">
          
          {/* ========================================== */}
          {/* SECTION SEARCH BAR ARTIKEL                 */}
          {/* ========================================== */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <input 
              type="text" 
              placeholder="Cari artikel..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()} // Bisa cari pakai tombol Enter
              className="w-full flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button 
              onClick={handleSearch}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cari
            </button>
          </div>

          {/* ========================================== */}
          {/* SECTION DAFTAR ARTIKEL                     */}
          {/* ========================================== */}
          <div className="mt-16"> 
            
            {/* Tampilan Loading */}
            {isLoadingArticles && (
              <div className="flex justify-center items-center h-40 text-indigo-600 font-semibold animate-pulse">
                Sedang memuat artikel...
              </div>
            )}

            {/* Tampilan Error */}
            {isErrorArticles && (
              <div className="text-center p-6 bg-red-50 text-red-500 rounded-xl border border-red-200">
                Gagal memuat data: {errorMsg}
              </div>
            )}

            {/* Tampilan Jika Data Kosong */}
            {!isLoadingArticles && !isErrorArticles &&  articles?.length === 0 && (
              <div className="text-center text-slate-500 mt-10">
                Artikel tidak ditemukan.
              </div>
            )}

            {/* Render Grid Artikel (Jika data sukses didapat) */}
            {!isLoadingArticles && !isErrorArticles && articles?.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] justify-items-center gap-6 lg:gap-8">
                {/* Looping data dari backend */}
                {articles.map((article) => (
                  <ArticleCard 
                    key={article._id || article.id} // Wajib ada 'key' di React, gunakan ID unik dari database
                    title={article.title}
                    date={formatedDate(article.createdAt)}
                    content={article.content} 
                    onEdit={() => console.log(`Buka halaman edit untuk ID: ${article._id || article.id}`)}
                    onCopy={() => console.log(`Artikel "${article.title}" disalin!`)}
                  />
                ))}
              </div>
            )}

          </div>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
