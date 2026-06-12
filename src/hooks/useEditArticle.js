import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useToast } from "./useToast";
import { ARTICLE_MESSAGES, ARTICLE_ROUTES } from "../lib/articleConstants";
import {
  buildArticleSavePayload,
  mapArticleToForm,
} from "../lib/articleUtils";
import { queryKeys } from "../lib/queryKeys";
import { articleService } from "../services/articleService";
import { keywordService } from "../services/keywordService";

const EDIT_ARTICLE_DRAFT_PREFIX = "admin-sop-edit-draft";
const AUTOSAVE_DELAY_MS = 700;

const getEditDraftKey = (id) => `${EDIT_ARTICLE_DRAFT_PREFIX}:${id}`;

const getStoredEditDraft = (id) => {
  if (typeof window === "undefined" || !id) return null;

  try {
    const draft = window.localStorage.getItem(getEditDraftKey(id));
    return draft ? JSON.parse(draft) : null;
  } catch {
    return null;
  }
};

const removeStoredEditDraft = (id) => {
  if (typeof window === "undefined" || !id) return;
  window.localStorage.removeItem(getEditDraftKey(id));
};

export const useEditArticle = (id) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(() => mapArticleToForm(null));
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedArticle, setHasLoadedArticle] = useState(false);
  const [loadedArticleId, setLoadedArticleId] = useState("");

  const goToHome = useCallback(() => {
    navigate(ARTICLE_ROUTES.home);
  }, [navigate]);

  const articleQuery = useQuery({
    queryKey: queryKeys.articles.detail(id),
    queryFn: () => articleService.getArticleById(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    let isActive = true;

    const hydrateArticleForm = async () => {
      await Promise.resolve();

      if (!isActive) return;

      if (!id) {
        setError(ARTICLE_MESSAGES.missingId);
        setLoading(false);
        setHasLoadedArticle(false);
        setLoadedArticleId("");
        showToast(ARTICLE_MESSAGES.missingId, "error");
        return;
      }

      if (articleQuery.isLoading) {
        setError(null);
        setLoading(true);
        setHasLoadedArticle(false);
        setLoadedArticleId("");
        return;
      }

      if (articleQuery.isError) {
        const message = articleQuery.error?.message || ARTICLE_MESSAGES.loadFailed;
        setError(message);
        setLoading(false);
        setHasLoadedArticle(false);
        setLoadedArticleId("");
        showToast(message, "error");
        return;
      }

      if (articleQuery.data === undefined) return;

      // Detail artikel dinormalisasi di helper agar struktur response backend tidak bocor ke UI.
      if (!articleQuery.data) {
        setError(ARTICLE_MESSAGES.notFound);
        setLoading(false);
        setHasLoadedArticle(false);
        setLoadedArticleId("");
        showToast(ARTICLE_MESSAGES.notFound, "error");
        return;
      }

      const articleForm = mapArticleToForm(articleQuery.data);
      const editDraft = getStoredEditDraft(id);

      setFormData(
        editDraft && typeof editDraft === "object"
          ? {
              ...articleForm,
              ...editDraft,
              keywords: Array.isArray(editDraft.keywords) ? editDraft.keywords : articleForm.keywords,
              details: {
                ...articleForm.details,
                ...(editDraft.details || {}),
              },
            }
          : articleForm,
      );
      setError(null);
      setHasLoadedArticle(true);
      setLoadedArticleId(id);
      setLoading(false);
    };

    hydrateArticleForm();

    return () => {
      isActive = false;
    };
  }, [
    articleQuery.data,
    articleQuery.error,
    articleQuery.isError,
    articleQuery.isLoading,
    id,
    showToast,
  ]);

  useEffect(() => {
    if (!hasLoadedArticle || loadedArticleId !== id || !id || loading || error) return undefined;

    const timerId = window.setTimeout(() => {
      window.localStorage.setItem(getEditDraftKey(id), JSON.stringify(formData));
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [error, formData, hasLoadedArticle, id, loadedArticleId, loading]);

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

  const handlePenangananChange = useCallback((penanganan) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      details: {
        ...currentFormData.details,
        Penanganan: penanganan,
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

      if (!formData.title.trim() && !formData.content.trim()) {
        const message = "Judul SOP wajib diisi.";
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
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.articles.lists() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.articles.detail(id) }),
        ]);
        removeStoredEditDraft(id);
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
    [formData, goToHome, id, queryClient, showToast],
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
    handlePenangananChange,
    handleSave,
  };
};
