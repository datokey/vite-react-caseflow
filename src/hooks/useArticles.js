import {useQuery} from '@tanstack/react-query'
import { articleService } from '../services/articleService';

export const useArticles = (params = {}) => {
    const { enabled = true, search, ...rest } = params;

    const {data, isLoading, isError, error} = useQuery({
        // Query key dinamis : jika paramater berubah ( misal pindah halaman ), React Query otomatis fetch ulang
        queryKey: ["articles", { search, ...rest }],

        // Memanggil fungsi dari service yang dibuat sebelumnya
        queryFn: () => {
            if (search) {
                return articleService.searchArticles(search, rest);
            }
            return articleService.getArticles(rest);
        },

        // Opsi tambahan : cache selama 5 menit, tidak refetch saat window focus
        enabled,
        staleTime: 5 * 60 * 1000, // 5 menit
        refetchOnWindowFocus: false,
    });

    return {
        articles: data,
        isLoadingArticles: isLoading,
        isErrorArticles: isError,
        errorMsg: error?.message,
    };
};
