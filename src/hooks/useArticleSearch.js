import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./useToast";
import { ARTICLE_MESSAGES, ARTICLE_ROUTES } from "../lib/articleConstants";
import {
  buildArticleSearchParams,
  formatArticleDate,
  getArticleId,
} from "../lib/articleUtils";
import { useArticles } from "./useArticles";

export const useArticleSearch = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  // Input dan query dipisah supaya artikel hanya fetch ulang saat user menekan tombol cari/Enter.
  const searchParams = useMemo(() => buildArticleSearchParams(query), [query]);
  const articlesState = useArticles(searchParams);

  const handleSearch = useCallback(() => {
    setQuery(searchInput.trim());
  }, [searchInput]);

  const handleSearchKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleEditArticle = useCallback(
    (article) => {
      const articleId = getArticleId(article);

      if (!articleId) {
        showToast(ARTICLE_MESSAGES.missingId, "error");
        return;
      }

      navigate(ARTICLE_ROUTES.edit(articleId));
    },
    [navigate, showToast],
  );

  const handleCreateArticle = useCallback(() => {
    navigate(ARTICLE_ROUTES.create);
  }, [navigate]);

  const handleCopyArticle = useCallback(
    (article) => {
      showToast(ARTICLE_MESSAGES.copySuccess(article?.title || "Artikel"), "success");
    },
    [showToast],
  );

  const handleCopyArticleError = useCallback(() => {
    showToast(ARTICLE_MESSAGES.copyFailed, "error");
  }, [showToast]);

  const getDisplayDate = useCallback((article) => formatArticleDate(article?.createdAt), []);

  return {
    ...articlesState,
    searchInput,
    setSearchInput,
    handleSearch,
    handleSearchKeyDown,
    handleCreateArticle,
    handleEditArticle,
    handleCopyArticle,
    handleCopyArticleError,
    getDisplayDate,
  };
};
