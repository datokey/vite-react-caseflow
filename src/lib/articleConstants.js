export const ARTICLE_ROUTES = {
  home: "/",
  create: "/create",
  edit: (id) => `/edit/${id}`,
};

export const ARTICLE_DATE_LOCALE = "id-ID";

export const EMPTY_ARTICLE_FORM = {
  title: "",
  content: "",
  keywords: [],
};

export const ARTICLE_MESSAGES = {
  loadingList: "Sedang memuat artikel...",
  loadingDetail: "Sedang memuat artikel...",
  emptyList: "Artikel tidak ditemukan.",
  missingId: "ID artikel tidak ditemukan.",
  notFound: "Artikel tidak ditemukan",
  loadFailed: "Gagal memuat artikel",
  saveSuccess: "Artikel berhasil diperbarui!",
  createSuccess: "Artikel berhasil dibuat!",
  saveFailed: "Gagal menyimpan artikel",
  createFailed: "Gagal membuat artikel",
  copySuccess: (title) => `Artikel "${title}" berhasil disalin.`,
  copyFailed: "Gagal menyalin teks. Silakan coba lagi.",
};
