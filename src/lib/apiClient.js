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
    const validationErrors = Array.isArray(data?.errors)
      ? data.errors
          .map((error) => {
            if (typeof error === "string") return error;
            return error?.message || error?.msg || error?.path || error?.field || "";
          })
          .filter(Boolean)
      : [];
    const message = [data?.message || data?.error || "Permintaan gagal diproses.", ...validationErrors]
      .filter(Boolean)
      .join(" ");

    throw new Error(message);
  }

  return data;
};
