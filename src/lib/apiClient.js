const DEFAULT_DEV_API_ORIGIN = "http://localhost:5000";
const rawApiOrigin = import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_API_BASE_URL || "";
const API_ORIGIN = import.meta.env.DEV
  ? DEFAULT_DEV_API_ORIGIN
  : rawApiOrigin.replace(/\/api\/?$/, "").replace(/\/$/, "");

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url);

const STATUS_ERROR_MESSAGES = {
  413: "Konten SOP terlalu besar untuk dikirim. Hapus gambar yang ikut ter-copy dari dokumen, lalu coba simpan lagi.",
  502: "Server sedang tidak bisa menjangkau layanan backend/AI. Coba lagi beberapa saat lagi atau pastikan service backend dan Qwen aktif.",
  503: "Server sedang tidak tersedia. Coba lagi beberapa saat lagi.",
  504: "Request terlalu lama diproses oleh server. Coba lagi atau cek proses backend yang berjalan.",
};

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

const stripHtml = (value = "") =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!rawText) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawText);
    } catch {
      return { message: rawText };
    }
  }

  return { message: stripHtml(rawText) };
};

export const apiRequest = async (endpoint, options = {}) => {
  let response;

  try {
    response = await fetch(buildApiUrl(endpoint), {
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      ...options,
    });
  } catch (error) {
    if (error?.message === "Endpoint API belum dikonfigurasi.") {
      throw error;
    }

    const requestError = new Error("Tidak dapat terhubung ke server. Pastikan backend aktif dan konfigurasi API sudah benar.");
    requestError.cause = error;
    throw requestError;
  }

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
    const message = [
      STATUS_ERROR_MESSAGES[response.status] || data?.message || data?.error || "Permintaan gagal diproses.",
      ...validationErrors,
    ]
      .filter(Boolean)
      .join(" ");

    const requestError = new Error(message);
    requestError.data = data;
    requestError.status = response.status;
    throw requestError;
  }

  return data;
};
