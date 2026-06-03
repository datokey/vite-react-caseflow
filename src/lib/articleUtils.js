import {
  ARTICLE_DATE_LOCALE,
  EMPTY_ARTICLE_FORM,
} from "./articleConstants";
import { normalizeKeyword, toKeywordPayload } from "./keywordUtils";

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
  return keyword?.keyword || keyword?.name || keyword?.title || keyword?.label || "";
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

const normalizeTextLines = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const hasHtmlMarkup = (value = "") => HTML_TAG_PATTERN.test(String(value || ""));

const normalizeInstructionPayload = (value) => {
  if (Array.isArray(value)) {
    const cleanedItems = value.map((item) => String(item || "").trim()).filter(Boolean);

    if (cleanedItems.length === 1 && hasHtmlMarkup(cleanedItems[0])) {
      return [cleanedItems[0]];
    }

    return cleanedItems;
  }

  if (typeof value === "string" && hasHtmlMarkup(value)) {
    return value.trim() ? [value.trim()] : [];
  }

  return normalizeTextLines(value);
};

const EMPTY_HANDLING_STEP = {
  judulPenanganan: "",
  instruksiInternal: "",
  templateChat: "",
};

const mapHandlingStepToForm = (step = {}) => ({
  _id: step?._id || step?.id,
  judulPenanganan: step?.judulPenanganan || "",
  instruksiInternal: Array.isArray(step?.instruksiInternal)
    ? step.instruksiInternal.length === 1 && hasHtmlMarkup(step.instruksiInternal[0])
      ? step.instruksiInternal[0]
      : step.instruksiInternal.join("\n")
    : step?.instruksiInternal || "",
  templateChat: step?.templateChat || "",
});

const mapHandlingToForm = (penanganan) => {
  if (Array.isArray(penanganan) && penanganan.length > 0) {
    return penanganan.map(mapHandlingStepToForm);
  }

  if (penanganan && typeof penanganan === "object") {
    return [mapHandlingStepToForm(penanganan)];
  }

  if (typeof penanganan === "string" && penanganan.trim()) {
    return [{ ...EMPTY_HANDLING_STEP, judulPenanganan: penanganan.trim() }];
  }

  return [{ ...EMPTY_HANDLING_STEP }];
};

const getCatatanValue = (details = {}) =>
  details.Catatan ?? details.catatan ?? details.Notes ?? details.notes;

const getArticleCatatanValue = (article) =>
  article?.catatan ?? article?.Catatan ?? getCatatanValue(article?.details);

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
    Kondisi: Array.isArray(article?.details?.Kondisi)
      ? article.details.Kondisi.join("\n")
      : article?.details?.Kondisi || "",
    Catatan: getArticleCatatanValue(article) || "Tidak ada catatan pada template ini",
    Penanganan: mapHandlingToForm(article?.details?.Penanganan),
  },
});

export const buildArticleSavePayload = (formData) => {
  const penanganan = formData.details?.Penanganan;
  const catatan = getCatatanValue(formData.details) || "Tidak ada catatan pada template ini";

  const penangananArray = mapHandlingToForm(penanganan)
    .map((step) => ({
      judulPenanganan: step.judulPenanganan || "",
      instruksiInternal: normalizeInstructionPayload(step.instruksiInternal),
      templateChat: step.templateChat || "",
    }))
    .filter(
      (step) =>
        step.judulPenanganan ||
        step.instruksiInternal.length > 0 ||
        step.templateChat,
    );

  return {
    title: formData.title,
    content: formData.content?.trim() || formData.title?.trim() || "",
    catatan,
    details: {
      JenisLog: formData.details?.JenisLog || "",
      Kondisi: normalizeTextLines(formData.details?.Kondisi),
      catatan,
      Catatan: catatan,
      Penanganan: penangananArray,
    },
    keyword: formData.keywords.map(toKeywordPayload),
  };
};
