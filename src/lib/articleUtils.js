import {
  ARTICLE_DATE_LOCALE,
  EMPTY_ARTICLE_FORM,
} from "./articleConstants";
import {
  HANDLING_ITEM_TYPES,
  buildHandlingStepPayload,
  createEmptyHandlingStep,
  createHandlingItem,
  normalizeHandlingStepForForm,
} from "./handlingItems";
import { normalizeKeyword, toKeywordPayload } from "./keywordUtils";
import { stripEmbeddedDataImages } from "./payloadSanitizer";

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

const getJenisLogValue = (article) =>
  article?.jenisLog ?? article?.details?.JenisLog ?? article?.details?.jenisLog ?? "";

const getConditionsValue = (article) =>
  article?.conditions ?? article?.details?.Kondisi ?? article?.details?.conditions ?? "";

const getHandlingValue = (article) =>
  article?.contentBlocks ?? article?.details?.Penanganan ?? article?.details?.penanganan;

const sortByOrder = (items = []) =>
  [...items].sort((firstItem, secondItem) => {
    const firstOrder = Number(firstItem?.order);
    const secondOrder = Number(secondItem?.order);
    const firstHasOrder = Number.isFinite(firstOrder);
    const secondHasOrder = Number.isFinite(secondOrder);

    if (firstHasOrder && secondHasOrder) return firstOrder - secondOrder;
    if (firstHasOrder) return -1;
    if (secondHasOrder) return 1;
    return 0;
  });

const mapHandlingToForm = (penanganan) => {
  if (Array.isArray(penanganan) && penanganan.length > 0) {
    return sortByOrder(penanganan).map(normalizeHandlingStepForForm);
  }

  if (penanganan && typeof penanganan === "object") {
    return [normalizeHandlingStepForForm(penanganan)];
  }

  if (typeof penanganan === "string" && penanganan.trim()) {
    return [
      {
        ...createEmptyHandlingStep(),
        judulPenanganan: "Penanganan",
        items: [
          {
            ...createHandlingItem(HANDLING_ITEM_TYPES.instruction),
            content: penanganan.trim(),
          },
        ],
      },
    ];
  }

  return [createEmptyHandlingStep()];
};

const getCatatanValue = (details) =>
  details?.Catatan ?? details?.catatan ?? details?.Notes ?? details?.notes;

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

export const mapArticleToForm = (article) => {
  const conditions = getConditionsValue(article);

  return {
    ...EMPTY_ARTICLE_FORM,
    title: article?.title || "",
    content: article?.content || "",
    keywords: mapArticleKeywords(article),
    details: {
      JenisLog: getJenisLogValue(article),
      Kondisi: Array.isArray(conditions) ? conditions.join("\n") : conditions,
      Catatan: getArticleCatatanValue(article) || "Tidak ada catatan pada template ini",
      Penanganan: mapHandlingToForm(getHandlingValue(article)),
    },
  };
};

export const buildArticleSavePayload = (formData) => {
  const details = formData?.details || {};
  const penanganan = details.Penanganan;
  const catatan = getCatatanValue(details) || "Tidak ada catatan pada template ini";
  const jenisLog = details.JenisLog || "";
  const conditions = normalizeTextLines(details.Kondisi);

  const sanitizeHandlingStepPayload = (step) => ({
    ...step,
    instruksiInternal: Array.isArray(step.instruksiInternal)
      ? step.instruksiInternal.map(stripEmbeddedDataImages)
      : [],
    templateChat: stripEmbeddedDataImages(step.templateChat || ""),
    catatan: Array.isArray(step.catatan)
      ? step.catatan.map(stripEmbeddedDataImages)
      : [],
    items: Array.isArray(step.items)
      ? step.items.map((item) => ({
          ...item,
          content: stripEmbeddedDataImages(item.content || ""),
        }))
      : [],
  });
  const penangananArray = mapHandlingToForm(penanganan)
    .map(buildHandlingStepPayload)
    .map(sanitizeHandlingStepPayload)
    .filter(
      (step) =>
        step.judulPenanganan ||
        step.instruksiInternal.length > 0 ||
        step.templateChat ||
        step.items.length > 0,
    );
  const contentBlocks = penangananArray.map((step, blockIndex) => ({
    type: "handling",
    title: step.judulPenanganan,
    order: blockIndex,
    items: step.items.map((item, itemIndex) => ({
      type: item.type,
      title: item.title || "",
      content: stripEmbeddedDataImages(item.content),
      order: itemIndex,
    })),
  }));
  const safeCatatan = stripEmbeddedDataImages(catatan);

  return {
    title: formData?.title || "",
    jenisLog,
    conditions,
    contentBlocks,
    keyword: (formData?.keywords || []).map(toKeywordPayload),

    // Field lama tetap dikirim untuk kompatibilitas controller/response lama.
    content: stripEmbeddedDataImages(formData?.content?.trim() || formData?.title?.trim() || ""),
    catatan: safeCatatan,
    details: {
      JenisLog: jenisLog,
      Kondisi: conditions,
      catatan: safeCatatan,
      Catatan: safeCatatan,
      Penanganan: penangananArray,
    },
  };
};
