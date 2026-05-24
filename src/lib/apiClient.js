const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url);

export const buildApiUrl = (endpoint) => {
  if (!endpoint) {
    throw new Error("Endpoint API belum dikonfigurasi.");
  }

  if (isAbsoluteUrl(endpoint)) {
    return endpoint;
  }

  const origin = API_ORIGIN.replace(/\/$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return `${origin}${path}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
};

export const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(buildApiUrl(endpoint), {
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Permintaan gagal diproses.");
  }

  return data;
};
