import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { articleService } from "../services/articleService";

export const useArticles = (params = {}) => {
    const { enabled = true, search, ...rest } = params;

    const {data, isLoading, isError, error} = useQuery({
        // Query key dinamis : jika paramater berubah ( misal pindah halaman ), React Query otomatis fetch ulang
        queryKey: queryKeys.articles.list({ search, ...rest }),

        // Memanggil fungsi dari service yang dibuat sebelumnya
        queryFn: () => {
            if (search) {
                return articleService.searchArticles(search, rest);
            }
            return articleService.getArticles(rest);
        },

        // Stale time dan refetch policy mengikuti default QueryClient.
        enabled,
    });

    return {
        articles: data,
        isLoadingArticles: isLoading,
        isErrorArticles: isError,
        errorMsg: error?.message,
    };
};
