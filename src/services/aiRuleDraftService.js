import { apiRequest } from "../lib/apiClient";

const AI_RULE_ENDPOINTS = {
  approve: import.meta.env.VITE_ENDPOINT_AI_RULE_DRAFT_APPROVE || "/api/ai-rule-drafts/:draftId/approve",
  generate: import.meta.env.VITE_ENDPOINT_AI_GENERATE_RULE || "/api/ai/generate-rule/:sopId",
  import: import.meta.env.VITE_ENDPOINT_AI_IMPORT_RULE_DRAFT || "/api/ai/import-rule-draft/:sopId",
  reject: import.meta.env.VITE_ENDPOINT_AI_RULE_DRAFT_REJECT || "/api/ai-rule-drafts/:draftId/reject",
};

const replacePathParam = (endpoint, paramName, value) =>
  endpoint.replace(`:${paramName}`, encodeURIComponent(value));

const getGenerateEndpoint = (sopId) => {
  if (!sopId) throw new Error("ID SOP belum tersedia.");
  return replacePathParam(AI_RULE_ENDPOINTS.generate, "sopId", sopId);
};

const getImportEndpoint = (sopId) => {
  if (!sopId) throw new Error("ID SOP belum tersedia.");
  return replacePathParam(AI_RULE_ENDPOINTS.import, "sopId", sopId);
};

const getDraftActionEndpoint = (endpoint, draftId) => {
  if (!draftId) throw new Error("ID draft belum tersedia.");
  return replacePathParam(endpoint, "draftId", draftId);
};

const normalizeDraftResponse = (data) => ({
  draft:
    data?.draft ??
    data?.data?.draft ??
    data?.result?.draft ??
    data?.data?.result?.draft ??
    data?.data ??
    null,
  draftId:
    data?.draftId ??
    data?.data?.draftId ??
    data?.draft?._id ??
    data?.draft?.id ??
    data?.data?.draft?._id ??
    data?.data?.draft?.id ??
    data?.data?._id ??
    data?.data?.id ??
    "",
  raw: data,
});

export const aiRuleDraftService = {
  async approveDraft(draftId, payload = {}) {
    const hasPayload = payload && Object.keys(payload).length > 0;

    return apiRequest(getDraftActionEndpoint(AI_RULE_ENDPOINTS.approve, draftId), {
      method: "POST",
      credentials: "include",
      ...(hasPayload ? { body: JSON.stringify(payload) } : {}),
    });
  },

  async generateRuleDraft(sopId) {
    const data = await apiRequest(getGenerateEndpoint(sopId), {
      method: "POST",
      credentials: "include",
    });

    return normalizeDraftResponse(data);
  },

  async importRuleDraft(sopId, rawJson) {
    const data = await apiRequest(getImportEndpoint(sopId), {
      method: "POST",
      credentials: "include",
      body: JSON.stringify({
        provider: "manual_online",
        rawJson,
      }),
    });

    return normalizeDraftResponse(data);
  },

  async rejectDraft(draftId) {
    return apiRequest(getDraftActionEndpoint(AI_RULE_ENDPOINTS.reject, draftId), {
      method: "POST",
      credentials: "include",
    });
  },
};
