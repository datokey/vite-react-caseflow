import { apiRequest } from "../lib/apiClient";

const AUTH_ENDPOINTS = {
  login: import.meta.env.VITE_ENDPOINT_AUTH_LOGIN,
  logout: import.meta.env.VITE_ENDPOINT_AUTH_LOGOUT,
  me: import.meta.env.VITE_ENDPOINT_AUTH_ME,
  register: import.meta.env.VITE_ENDPOINT_AUTH_REGISTER,
};

const getUserFromResponse = (data) => data?.user || data?.data?.user || data?.data || null;

export const authService = {
  async getCurrentUser() {
    const data = await apiRequest(AUTH_ENDPOINTS.me,{
      credentials:"include",
    });
    return getUserFromResponse(data);
  },

  async login(credentials) {
    const data = await apiRequest(AUTH_ENDPOINTS.login, {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    return getUserFromResponse(data);
  },

  async register(payload) {
    const data = await apiRequest(AUTH_ENDPOINTS.register, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return getUserFromResponse(data);
  },

  async logout() {
    await apiRequest(AUTH_ENDPOINTS.logout, {
      method: "POST",
    });
  },
};
