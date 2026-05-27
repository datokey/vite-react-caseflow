import { apiRequest } from "../lib/apiClient";
import { normalizeKeyword } from "../lib/keywordUtils";

const KEYWORD_ENDPOINTS = {
  base: import.meta.env.VITE_ENDPOINT_METADATA,
  search: import.meta.env.VITE_ENDPOINT_METADATA_SEARCH,
};

const DEFAULT_KEYWORD_LIMIT = 10;

const buildQueryString = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `?${queryString}` : "";
};

const getKeywordsFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  return data?.keywords || data?.metadata || data?.data?.keywords || data?.data?.metadata || data?.data || [];
};

const getKeywordFromResponse = (data) => data?.keyword || data?.metadata || data?.data?.keyword || data?.data?.metadata || data?.data || data;

export const keywordService = {
  async searchKeywords(query, params = {}) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const url = `${KEYWORD_ENDPOINTS.search}${buildQueryString({
      q: trimmedQuery,
      limit: DEFAULT_KEYWORD_LIMIT,
      ...params,
    })}`;

    const data = await apiRequest(url, {
      method: "GET",
      credentials: "include",
    });

    return getKeywordsFromResponse(data).map((keyword) => normalizeKeyword(keyword)).filter((keyword) => keyword.label);
  },

  async createKeyword(label) {
    const keywordName = label.trim();

    if (!keywordName) {
      throw new Error("Keyword tidak boleh kosong.");
    }

    const data = await apiRequest(KEYWORD_ENDPOINTS.base, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({ keyword: keywordName }),
    });

    return normalizeKeyword(getKeywordFromResponse(data), { label: keywordName, value: keywordName.toLowerCase() });
  },
};
