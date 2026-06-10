import { apiRequest } from "../lib/apiClient";

const SOP_RULE_ENDPOINTS = {
  base: import.meta.env.VITE_ENDPOINT_SOP_RULES || "/api/sop-rules",
};

const buildQueryString = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ).toString();

  return queryString ? `?${queryString}` : "";
};

const getRulesFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rules)) return data.rules;
  if (Array.isArray(data?.data?.rules)) return data.data.rules;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
};

export const sopRuleService = {
  async getRulesBySopId(sopId) {
    const data = await apiRequest(`${SOP_RULE_ENDPOINTS.base}${buildQueryString({ sopId })}`, {
      method: "GET",
      credentials: "include",
    });

    return getRulesFromResponse(data);
  },
};
