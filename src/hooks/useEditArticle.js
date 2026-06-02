import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./useToast";
import { ARTICLE_MESSAGES, ARTICLE_ROUTES } from "../lib/articleConstants";
import {
  buildArticleSavePayload,
  mapArticleToForm,
} from "../lib/articleUtils";
import { articleService } from "../services/articleService";
import { keywordService } from "../services/keywordService";

export const useEditArticle = (id) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(() => mapArticleToForm(null));
  const [isSaving, setIsSaving] = useState(false);

  const goToHome = useCallback(() => {
    navigate(ARTICLE_ROUTES.home);
  }, [navigate]);

  useEffect(() => {
    let isActive = true;

    const loadArticle = async () => {
      if (!id) {
        setError(ARTICLE_MESSAGES.missingId);
        setLoading(false);
        showToast(ARTICLE_MESSAGES.missingId, "error");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Detail artikel dinormalisasi di helper agar struktur response backend tidak bocor ke UI.
        const article = await articleService.getArticleById(id);

        if (!isActive) return;

        if (!article) {
          setError(ARTICLE_MESSAGES.notFound);
          showToast(ARTICLE_MESSAGES.notFound, "error");
          return;
        }

        setFormData(mapArticleToForm(article));
      } catch (err) {
        if (!isActive) return;

        const message = err?.message || ARTICLE_MESSAGES.loadFailed;
        setError(message);
        showToast(message, "error");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadArticle();

    return () => {
      isActive = false;
    };
  }, [id, showToast]);

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
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

  const handleContentChange = useCallback((content) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      content,
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

        // Keyword baru dibuat lebih dulu agar artikel bisa menyimpan relasi keyword yang valid.
        const savedKeywords = await keywordService.persistKeywords(formData.keywords);
        const articlePayload = buildArticleSavePayload({
          ...formData,
          keywords: savedKeywords,
        });

        // Payload artikel disiapkan setelah keyword baru dipastikan tersimpan di database.
        await articleService.saveArticleChanges(id, articlePayload);
        showToast(ARTICLE_MESSAGES.saveSuccess, "success");
        goToHome();
      } catch (err) {
        const message = err?.message || ARTICLE_MESSAGES.saveFailed;
        setError(message);
        showToast(message, "error");
      } finally {
        setIsSaving(false);
      }
    },
    [formData, goToHome, id, showToast],
  );

  return {
    loading,
    error,
    formData,
    isSaving,
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
  };
};
