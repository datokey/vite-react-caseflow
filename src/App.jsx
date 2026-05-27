import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ArticleCard from './components/ArticleCard';
import Footer from './components/Footer';
import EditPage from './pages/EditPage';
import { useArticleSearch } from './hooks/useArticleSearch';
import { ARTICLE_MESSAGES } from './lib/articleConstants';
import { getArticleId } from './lib/articleUtils';

function HomePage() {
  const {
    articles,
    errorMsg,
    getDisplayDate,
    handleCopyArticle,
    handleCopyArticleError,
    handleEditArticle,
    handleSearch,
    handleSearchKeyDown,
    isErrorArticles,
    isLoadingArticles,
    searchInput,
    setSearchInput,
  } = useArticleSearch();

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Search bar hanya mengubah query saat user submit, bukan setiap mengetik. */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <input 
            type="text" 
            placeholder="Cari artikel..." 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          <button 
            onClick={handleSearch}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Cari
          </button>
        </div>

        {/* SECTION DAFTAR ARTIKEL */}
        <div className="mt-16">
          {isLoadingArticles && (
            <div className="flex justify-center items-center h-40 text-indigo-600 font-semibold animate-pulse">
              {ARTICLE_MESSAGES.loadingList}
            </div>
          )}

          {isErrorArticles && (
            <div className="text-center p-6 bg-red-50 text-red-500 rounded-xl border border-red-200">
              Gagal memuat data: {errorMsg}
            </div>
          )}

          {!isLoadingArticles && !isErrorArticles && articles?.length === 0 && (
            <div className="text-center text-slate-500 mt-10">
              {ARTICLE_MESSAGES.emptyList}
            </div>
          )}

          {!isLoadingArticles && !isErrorArticles && articles?.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] justify-items-center gap-6 lg:gap-8">
              {articles.map((article) => (
                <ArticleCard 
                  key={getArticleId(article)}
                  title={article.title}
                  date={getDisplayDate(article)}
                  content={article.content} 
                  onEdit={() => handleEditArticle(article)}
                  onCopy={() => handleCopyArticle(article)}
                  onCopyError={handleCopyArticleError}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/edit/:id" element={<EditPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
