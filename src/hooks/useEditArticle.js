import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./useToast";
import { ARTICLE_MESSAGES, ARTICLE_ROUTES } from "../lib/articleConstants";
import {
  buildArticleSavePayload,
  mapArticleToForm,
} from "../lib/articleUtils";
import { articleService } from "../services/articleService";

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

  const handleSave = useCallback(
    async (event) => {
      event.preventDefault();

      try {
        setIsSaving(true);
        setError(null);

        // Alur submit lama dipertahankan, tetapi payload disiapkan di helper dan dikirim lewat service.
        await articleService.saveArticleChanges(id, buildArticleSavePayload(formData));
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
    handleInputChange,
    handleSave,
  };
};
