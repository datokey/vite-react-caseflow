import {
  ARTICLE_DATE_LOCALE,
  EMPTY_ARTICLE_FORM,
} from "./articleConstants";
import { normalizeKeyword, toKeywordId, toKeywordPayload } from "./keywordUtils";

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

const getUniqueKeywords = (keywords) => {
  const keywordMap = new Map();

  keywords.forEach((keyword) => {
    if (keyword.label && !keywordMap.has(keyword.value)) {
      keywordMap.set(keyword.value, keyword);
    }
  });

  return Array.from(keywordMap.values());
};

export const mapArticleKeywords = (article) => {
  const keywords = article?.keyword ?? article?.keywords ?? [];

  if (typeof keywords === "string") {
    return getUniqueKeywords(
      keywords
        .split(",")
        .map((keyword) => normalizeKeyword(keyword))
        .filter((keyword) => keyword.label),
    );
  }

  if (!Array.isArray(keywords)) {
    return [];
  }

  return getUniqueKeywords(
    keywords
      .map((keyword) => {
        const normalizedKeyword = normalizeKeyword(keyword);
        const label = getKeywordText(keyword) || normalizedKeyword.label;

        return normalizeKeyword(keyword, { label, value: label.toLowerCase() });
      })
      .filter((keyword) => keyword.label),
  );
};

export const mapArticleToForm = (article) => ({
  ...EMPTY_ARTICLE_FORM,
  title: article?.title || "",
  content: article?.content || "",
  keywords: mapArticleKeywords(article),
  details: {
    JenisLog: article?.details?.JenisLog || "",
    Kondisi: article?.details?.Kondisi || "",
    Penanganan: article?.details?.Penanganan || "",
  },
});

export const buildArticleSavePayload = (formData) => ({
  title: formData.title,
  content: formData.content,
  details: {
    JenisLog: formData.details?.JenisLog || "",
    Kondisi: formData.details?.Kondisi || "",
    Penanganan: formData.details?.Penanganan || "",
  },
  // Beberapa backend memakai nama field berbeda untuk relasi keyword.
  // Payload ini mengirim ID dan object ringkas agar update artikel tetap kompatibel.
  keywordIds: formData.keywords.map(toKeywordId).filter(Boolean),
  keyword: formData.keywords.map(toKeywordPayload),
  keywords: formData.keywords.map(toKeywordPayload),
});
