import {
  ARTICLE_DATE_LOCALE,
  EMPTY_ARTICLE_FORM,
} from "./articleConstants";

export const getArticleId = (article) => article?._id || article?.id;

export const buildArticleSearchParams = (query) => {
  const trimmedQuery = query.trim();
  return trimmedQuery ? { search: trimmedQuery } : {};
};

export const formatArticleDate = (date, locale = ARTICLE_DATE_LOCALE) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleDateString(locale);
};

const getKeywordText = (keyword) => {
  if (typeof keyword === "string") return keyword;
  return keyword?.keyword || "";
};

export const formatArticleKeywords = (article) => {
  const keywords = article?.keyword ?? article?.keywords ?? [];

  if (typeof keywords === "string") {
    return keywords;
  }

  if (!Array.isArray(keywords)) {
    return "";
  }

  return keywords.map(getKeywordText).filter(Boolean).join(", ");
};

export const mapArticleToForm = (article) => ({
  ...EMPTY_ARTICLE_FORM,
  title: article?.title || "",
  content: article?.content || "",
  keywords: formatArticleKeywords(article),
});

export const buildArticleSavePayload = (formData) => ({
  title: formData.title,
  content: formData.content,
  keywords: formData.keywords,
});
