import { apiRequest } from "../lib/apiClient";

const ARTICLE_ENDPOINTS = {
    base: import.meta.env.VITE_ENDPOINT_ARTICLES,
    search: import.meta.env.VITE_ENDPOINT_ARTICLES_SEARCH,
    detail: import.meta.env.VITE_ENDPOINT_ARTICLE_DETAIL,
};

const buildQueryString = (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return queryString ? `?${queryString}` : "";
};

// Helper function untuk mengekstrak data dari berbagai kemungkinan struktur response backend
const getArticlesFromResponse = (data) => {
    if (Array.isArray(data)) return data;
    return data?.articles || data?.data?.articles || data?.data || [];
};
const getSingleArticleFromResponse = (data) => {
    if (!data) return null;
    return data?.article || data?.data?.article || data?.data || data;
};

export const articleService = {
    /**
   * Mengambil daftar semua artikel
   * Bisa menerima parameter pagination, contoh: { page: 1, limit: 10 }
   */
    async getArticles(params = {}) {
        const url = `${ARTICLE_ENDPOINTS.base}${buildQueryString(params)}`;

        const data = await apiRequest(url, {
            method: "GET",
            credentials: "include",
        });

        return getArticlesFromResponse(data);
    },
    /**
   * Mencari artikel berdasarkan keyword
   */
    async searchArticles(keyword, params = {}) {
        const url = `${ARTICLE_ENDPOINTS.search}${buildQueryString({ q: keyword, ...params })}`;

        const data = await apiRequest(url, {
            method: "GET",
            credentials: "include",
        });

        return getArticlesFromResponse(data);
    },
    /**
     * Mengambil detail satu artikel berdasarkan ID atau Slug
     */
    async getArticleById(id) {
        const url = ARTICLE_ENDPOINTS.detail.replace(":id", id);
        const data = await apiRequest(url, {
            method: "GET",
            credentials: "include",
        });
        return getSingleArticleFromResponse(data);
    },
    /**
     * Menyimpan perubahan artikel beserta relasi keyword yang dipilih user.
     */
    async saveArticleChanges(id, payload) {
        if (!id) {
            throw new Error("ID artikel tidak ditemukan.");
        }

        const url = ARTICLE_ENDPOINTS.detail.replace(":id", id);
        const data = await apiRequest(url, {
            method: "PUT",
            credentials: "include",
            body: JSON.stringify(payload),
        });

        return getSingleArticleFromResponse(data);
    },
};
