import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ArticleForm from "../components/articles/ArticleForm";
import { useCreateArticle } from "../hooks/useCreateArticle";

export default function CreateArticlePage() {
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
  } = useCreateArticle();

  return (
    <>
      <Navbar />
      <div className="bg-slate-50 min-h-screen">
        <main className="max-w-4xl mx-auto px-4 py-10">
          <div className="mb-8">
            <button
              type="button"
              onClick={goToHome}
              className="inline-flex items-center gap-2 mb-4 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Kembali
            </button>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">Buat Artikel</h1>
          </div>

          {error && (
            <div className="text-center p-6 bg-red-50 text-red-500 rounded-xl border border-red-200 mb-6">
              {error}
            </div>
          )}

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
            submitLabel="Publikasikan Artikel"
            submittingLabel="Mempublikasikan..."
          />
        </main>
      </div>
      <Footer />
    </>
  );
}
