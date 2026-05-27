import { useQuery } from "@tanstack/react-query";
import { keywordService } from "../services/keywordService";

export const useKeywordSearch = (query) => {
  const trimmedQuery = query.trim();

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["keywords", "search", trimmedQuery],
    queryFn: () => keywordService.searchKeywords(trimmedQuery),
    enabled: trimmedQuery.length > 0,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    keywords: data || [],
    isSearchingKeywords: isFetching,
    isErrorKeywords: isError,
    keywordErrorMsg: error?.message,
  };
};
