import { apiRequest } from "../lib/apiClient";

const ARTICLE_ENDPOINTS = {
    base: import.meta.env.VITE_ENDPOINT_ARTICLES,
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
   * Bisa menerima parameter untuk search/pagination, contoh: { search: "react", page: 1 }
   */
    async getArticles(params = {}) {
        //Membentuk query string dari params contoh: {?search=react&page=1}
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${ARTICLE_ENDPOINTS.base}?${queryString}` : ARTICLE_ENDPOINTS.base;

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
        const data = await apiRequest(`${ARTICLE_ENDPOINTS.base}/${id}`, {
        method: "GET",
        credentials: "include",
        });
        return getSingleArticleFromResponse(data);
        
    }, 
    /**
     * Mengambil detail satu artikel berdasarkan keyword
     */
    async getArticleById(keyword) {
        const data = await apiRequest(`${ARTICLE_ENDPOINTS.base}/${keyword}`, {
           method:"GET",
           credentials: "include" ,
        });
    return getArticlesFromResponse (data);
    }
  

};