import { apiRequest } from "../lib/apiClient";

const USER_ENDPOINTS = {
  base: import.meta.env.VITE_ENDPOINT_USERS,
  changeProfile: import.meta.env.VITE_ENDPOINT_USERS_CHANGE_PROFILE,
  resetPassword: import.meta.env.VITE_ENDPOINT_USER_RESET_PASSWORD,
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

const getUserResetPasswordEndpoint = (id) => {
  if (!id) {
    throw new Error("ID user tidak ditemukan.");
  }

  const resetEndpoint = USER_ENDPOINTS.resetPassword || `${getUserDetailEndpoint(id)}/reset-password`;
  return resetEndpoint.replace(":id", encodeURIComponent(id));
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

const getUserFromResponse = (data) =>
  data?.user ??
  data?.updatedUser ??
  data?.profile ??
  data?.data?.user ??
  data?.data?.updatedUser ??
  data?.data?.profile ??
  data?.data ??
  data ??
  null;

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

  async resetUserPassword(id, payload = {}) {
    const requestOptions = {
      method: "PATCH",
      credentials: "include",
    };

    if (Object.keys(payload).length) {
      requestOptions.body = JSON.stringify(payload);
    }

    return apiRequest(getUserResetPasswordEndpoint(id), requestOptions);
  },

  async updateProfile(payload) {
    const data = await apiRequest(USER_ENDPOINTS.changeProfile, {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify(payload),
    });

    return getUserFromResponse(data);
  },

  async changePassword(payload) {
    const data = await apiRequest(USER_ENDPOINTS.changeProfile, {
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify(payload),
    });

    return getUserFromResponse(data);
  },
};
