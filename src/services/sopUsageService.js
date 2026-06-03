import { apiRequest } from "../lib/apiClient";

const SOP_USAGE_ENDPOINTS = {
  frequentlyUsed: import.meta.env.VITE_ENDPOINT_SOP_FREQUENTLY_USED,
  logCopy: import.meta.env.VITE_ENDPOINT_SOP_LOG_COPY,
};

const unwrapSopId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return value.$oid ?? value._id ?? value.id ?? "";
  return value;
};

const getSopIdFromItem = (item) =>
  unwrapSopId(
    item?.idSop ??
      item?.sopId ??
      item?.templateSopId ??
      item?.articleId ??
      item?.sop?._id ??
      item?.sop?.id ??
      item?.templateSop?._id ??
      item?.templateSop?.id ??
      item?.article?._id ??
      item?.article?.id ??
      item?._id ??
      item?.id,
  );

const getSopTitleFromItem = (item) =>
  item?.title ??
  item?.sopTitle ??
  item?.templateTitle ??
  item?.name ??
  item?.sop?.title ??
  item?.templateSop?.title ??
  item?.article?.title ??
  "Tanpa judul SOP";

const getUsageCountFromItem = (item) => {
  const parsedValue = Number(item?.count ?? item?.total ?? item?.copyCount ?? item?.usedCount ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const getFrequentlyUsedFromResponse = (data) => {
  if (Array.isArray(data)) return data;

  return (
    data?.frequentlyUsed ??
    data?.popular ??
    data?.sops ??
    data?.templateSops ??
    data?.data?.frequentlyUsed ??
    data?.data?.popular ??
    data?.data?.sops ??
    data?.data?.templateSops ??
    data?.data ??
    []
  );
};

export const normalizeFrequentlyUsedSop = (item = {}) => ({
  count: getUsageCountFromItem(item),
  id: String(getSopIdFromItem(item) || ""),
  raw: item,
  sop: item?.sop ?? item?.templateSop ?? item?.article ?? item,
  title: getSopTitleFromItem(item),
});

export const sopUsageService = {
  async getFrequentlyUsed() {
    const data = await apiRequest(SOP_USAGE_ENDPOINTS.frequentlyUsed, {
      method: "GET",
      credentials: "include",
    });

    return getFrequentlyUsedFromResponse(data)
      .map((item) => normalizeFrequentlyUsedSop(item))
      .filter((item) => item.id || item.title)
      .slice(0, 4);
  },

  async logCopy(idSop) {
    if (!idSop) return null;

    return apiRequest(SOP_USAGE_ENDPOINTS.logCopy, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ idSop }),
    });
  },
};
