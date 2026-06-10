import { apiRequest } from "../lib/apiClient";

const DECISION_ENDPOINTS = {
  categories: import.meta.env.VITE_ENDPOINT_DECISION_CATEGORIES || "/api/decision/categories",
  nextOptions: import.meta.env.VITE_ENDPOINT_DECISION_NEXT_OPTIONS || "/api/decision/next-options",
  questions: import.meta.env.VITE_ENDPOINT_DECISION_QUESTIONS || "/api/decision/questions",
  run: import.meta.env.VITE_ENDPOINT_DECISION_RUN || "/api/decision/run",
};

const buildQueryString = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `?${queryString}` : "";
};

const getItemsFromResponse = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }

  return data?.data?.items ?? data?.items ?? data?.data ?? [];
};

const getDecisionFromResponse = (data) =>
  data?.decision ??
  data?.result ??
  data?.data?.decision ??
  data?.data?.result ??
  data?.data ??
  data ??
  null;

export const decisionService = {
  async getCategories(logType) {
    const data = await apiRequest(
      `${DECISION_ENDPOINTS.categories}${buildQueryString({ logType })}`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    return getItemsFromResponse(data, ["categories", "categoryOptions"]);
  },

  async getNextOptions({ category, logType }) {
    const data = await apiRequest(
      `${DECISION_ENDPOINTS.nextOptions}${buildQueryString({ logType, category })}`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    return getItemsFromResponse(data, ["options", "nextOptions", "subCategories", "subCategoryOptions", "cases"]);
  },

  async getQuestions({ category, logType, subCategory }) {
    const data = await apiRequest(
      `${DECISION_ENDPOINTS.questions}${buildQueryString({ logType, category, subCategory })}`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    return getItemsFromResponse(data, ["questions"]);
  },

  async runDecision(payload) {
    const data = await apiRequest(DECISION_ENDPOINTS.run, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(payload),
    });

    return getDecisionFromResponse(data);
  },
};
