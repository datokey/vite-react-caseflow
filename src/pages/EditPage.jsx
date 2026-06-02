import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArticleForm from '../components/articles/ArticleForm';
import { useEditArticle } from '../hooks/useEditArticle';
import { ARTICLE_MESSAGES } from '../lib/articleConstants';

export default function EditPage() {
  const { id } = useParams();
  const {
    error,
    formData,
    goToHome,
    handleContentChange,
    handleDetailsChange,
    handleEditorError,
    handleInputChange,
    handleKondisiChange,
    handleKondisiEditorError,
    handleKeywordsChange,
    handleKeywordSearchError,
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

          {/* Form edit memakai ArticleForm yang sama dengan create agar editor dan keyword tetap konsisten. */}
          {!loading && !error && (
            <ArticleForm
              formData={formData}
              isSaving={isSaving}
              onCancel={goToHome}
              onChangeContent={handleContentChange}
              onChangeDetails={handleDetailsChange}
              onChangeField={handleInputChange}
              onChangeKeywords={handleKeywordsChange}
              onChangeKondisi={handleKondisiChange}
              onEditorError={handleEditorError}
              onKondisiEditorError={handleKondisiEditorError}
              onKeywordError={handleKeywordSearchError}
              onSubmit={handleSave}
              submitLabel="Simpan Perubahan"
            />
          )}
        </main>
      </div>
      <Footer />
    </>
  );
}
