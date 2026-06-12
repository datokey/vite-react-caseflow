import { QueryClient } from "@tanstack/react-query";

export const QUERY_STALE_TIME_MS = 5 * 60 * 1000;
export const QUERY_CACHE_TIME_MS = 30 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      gcTime: QUERY_CACHE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
