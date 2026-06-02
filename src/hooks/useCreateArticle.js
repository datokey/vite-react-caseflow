import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "./useDebounce";
import { useToast } from "./useToast";
import { ARTICLE_MESSAGES, ARTICLE_ROUTES } from "../lib/articleConstants";
import { buildArticleSavePayload, mapArticleToForm } from "../lib/articleUtils";
import { articleService } from "../services/articleService";
import { keywordService } from "../services/keywordService";

const CREATE_ARTICLE_DRAFT_KEY = "create-article-draft";
const AUTOSAVE_DELAY_MS = 700;

const getInitialFormData = () => {
  try {
    const draft = window.localStorage.getItem(CREATE_ARTICLE_DRAFT_KEY);
    const parsedDraft = draft ? JSON.parse(draft) : null;

    return parsedDraft
      ? {
          ...mapArticleToForm(null),
          ...parsedDraft,
          keywords: Array.isArray(parsedDraft.keywords) ? parsedDraft.keywords : [],
        }
      : mapArticleToForm(null);
  } catch {
    return mapArticleToForm(null);
  }
};

export const useCreateArticle = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState(getInitialFormData);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const debouncedFormData = useDebounce(formData, AUTOSAVE_DELAY_MS);

  const hasDraftContent = useMemo(
    () => Boolean(
      formData.title ||
      formData.content ||
      formData.keywords.length ||
      formData.details?.JenisLog ||
      formData.details?.Kondisi ||
      formData.details?.Penanganan
    ),
    [formData],
  );

  const goToHome = useCallback(() => {
    navigate(ARTICLE_ROUTES.home);
  }, [navigate]);

  useEffect(() => {
    if (!hasDraftContent) {
      window.localStorage.removeItem(CREATE_ARTICLE_DRAFT_KEY);
      return;
    }

    // Draft create disimpan lokal agar tulisan user tidak hilang saat refresh/tab tertutup.
    window.localStorage.setItem(CREATE_ARTICLE_DRAFT_KEY, JSON.stringify(debouncedFormData));
  }, [debouncedFormData, hasDraftContent]);

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  }, []);

  const handleContentChange = useCallback((content) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      content,
    }));
  }, []);

  const handleKeywordsChange = useCallback((keywords) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      keywords,
    }));
  }, []);

  const handleDetailsChange = useCallback((field, value) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      details: {
        ...currentFormData.details,
        [field]: value,
      },
    }));
  }, []);

  const handleKondisiChange = useCallback((content) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      details: {
        ...currentFormData.details,
        Kondisi: content,
      },
    }));
  }, []);

  const handleKeywordSearchError = useCallback(
    (message) => {
      showToast(message || "Gagal memuat suggestion keyword.", "error");
    },
    [showToast],
  );

  const handleEditorError = useCallback(
    (message) => {
      showToast(message || "Gagal memproses konten artikel.", "error");
    },
    [showToast],
  );

  const handleKondisiEditorError = useCallback(
    (message) => {
      showToast(message || "Gagal memproses kondisi.", "error");
    },
    [showToast],
  );

  const handleSave = useCallback(
    async (event) => {
      event.preventDefault();

      if (!formData.content.trim()) {
        const message = "Konten artikel wajib diisi.";
        setError(message);
        showToast(message, "error");
        return;
      }

      try {
        setIsSaving(true);
        setError(null);

        const savedKeywords = await keywordService.persistKeywords(formData.keywords);
        const articlePayload = buildArticleSavePayload({
          ...formData,
          keywords: savedKeywords,
        });

        await articleService.createArticle(articlePayload);
        window.localStorage.removeItem(CREATE_ARTICLE_DRAFT_KEY);
        showToast(ARTICLE_MESSAGES.createSuccess, "success");
        goToHome();
      } catch (err) {
        const message = err?.message || ARTICLE_MESSAGES.createFailed;
        setError(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [formData, goToHome, showToast],
  );

  return {
    error,
    formData,
    goToHome,
    handleContentChange,
    handleDetailsChange,
    handleEditorError,
    handleInputChange,
    handleKondisiChange,
    handleKondisiEditorError,
    handleKeywordsChange,
    handleKeywordSearchError,
    handleSave,
    isSaving,
  };
};
