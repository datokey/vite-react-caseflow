import { apiRequest } from "../lib/apiClient";

const USER_ENDPOINTS = {
  base: import.meta.env.VITE_ENDPOINT_USERS,
  search: import.meta.env.VITE_ENDPOINT_USERS_SEARCH,
  detailDeleteUpdate: import.meta.env.VITE_ENDPOINT_USER_DETAIL_DELETE_UPDATE,
};

const buildQueryString = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return queryString ? `?${queryString}` : "";
};

const getUserDetailEndpoint = (id) => {
  if (!id) {
    throw new Error("ID user tidak ditemukan.");
  }

  const detailEndpoint = USER_ENDPOINTS.detailDeleteUpdate || `${USER_ENDPOINTS.base}/:id`;
  return detailEndpoint.replace(":id", encodeURIComponent(id));
};

const getUsersFromResponse = (data) => {
  if (Array.isArray(data)) return data;

  return (
    data?.users ??
    data?.agents ??
    data?.data?.users ??
    data?.data?.agents ??
    data?.data?.items ??
    data?.data ??
    []
  );
};

const getUsersTotalFromResponse = (data, users) => {
  const total = Number(
    data?.total ??
      data?.totalUsers ??
      data?.count ??
      data?.data?.total ??
      data?.data?.totalUsers ??
      data?.data?.count ??
      users.length,
  );

  return Number.isFinite(total) ? total : users.length;
};

export const userService = {
  async getUsers(params = {}) {
    const data = await apiRequest(`${USER_ENDPOINTS.base}${buildQueryString(params)}`, {
      method: "GET",
      credentials: "include",
    });
    const users = getUsersFromResponse(data);

    return {
      total: getUsersTotalFromResponse(data, users),
      users,
    };
  },

  async searchUsers(keyword, params = {}) {
    const data = await apiRequest(`${USER_ENDPOINTS.search}${buildQueryString({ q: keyword, ...params })}`, {
      method: "GET",
      credentials: "include",
    });
    const users = getUsersFromResponse(data);

    return {
      total: getUsersTotalFromResponse(data, users),
      users,
    };
  },

  async updateUserRole(id, role) {
    return apiRequest(getUserDetailEndpoint(id), {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify({ role }),
    });
  },
};
