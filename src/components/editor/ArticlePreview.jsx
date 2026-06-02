const ArticlePreview = ({ content }) => {
  if (!content) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
        Belum ada konten untuk preview.
      </div>
    );
  }

  return (
    <div
      className="article-content min-h-[22rem] rounded-lg border border-slate-200 bg-white px-4 py-4 text-slate-700 md:px-5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default ArticlePreview;
