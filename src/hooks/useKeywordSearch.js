import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { keywordService } from "../services/keywordService";

export const useKeywordSearch = (query) => {
  const trimmedQuery = query.trim();

  const { data, isFetching, isError, error } = useQuery({
    queryKey: queryKeys.keywords.search(trimmedQuery),
    queryFn: () => keywordService.searchKeywords(trimmedQuery),
    enabled: trimmedQuery.length > 0,
    staleTime: 60 * 1000,
  });

  return {
    keywords: data || [],
    isSearchingKeywords: isFetching,
    isErrorKeywords: isError,
    keywordErrorMsg: error?.message,
  };
};
