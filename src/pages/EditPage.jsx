import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useEditArticle } from '../hooks/useEditArticle';
import { ARTICLE_MESSAGES } from '../lib/articleConstants';

export default function EditPage() {
  const { id } = useParams();
  const {
    error,
    formData,
    goToHome,
    handleInputChange,
    handleSave,
    isSaving,
    loading,
  } = useEditArticle(id);

  return (
    <>
      <Navbar />
      <div className="bg-slate-50 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-10">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={goToHome}
              className="inline-flex items-center gap-2 mb-4 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Kembali
            </button>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Edit Artikel</h1>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center h-40 text-indigo-600 font-semibold animate-pulse">
              {ARTICLE_MESSAGES.loadingDetail}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center p-6 bg-red-50 text-red-500 rounded-xl border border-red-200 mb-6">
              {error}
            </div>
          )}

          {/* Form */}
          {!loading && !error && (
            <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
              <div className="space-y-6">
                {/* Field form memakai state dari hook agar UI tidak perlu tahu detail fetch/submit artikel. */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Judul Artikel
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Masukkan judul artikel..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  />
                </div>

                {/* Konten */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Konten Artikel
                  </label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    placeholder="Masukkan konten artikel..."
                    rows={12}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                    required
                  />
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Keyword (pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    name="keywords"
                    value={formData.keywords}
                    onChange={handleInputChange}
                    placeholder="Contoh: react, javascript, programming"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={goToHome}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"></circle>
                          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      <>Simpan Perubahan</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
