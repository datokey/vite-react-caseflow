import {useQuery} from '@tanstack/react-query'
import { articleService } from '../services/articleService';

export const useArticles = (params = {}) => {
    const {data, isLoading, isError, error} = useQuery({
        //Query key dinamis : jika paramater berubah ( misal pindah halaman ), React Query otomatis fetch ulang
        queryKey: ["articles", params],

        //Memangil fungsi dari service yang dibuat sebelumya 
        queryFn: () => articleService.getArticles(params),

        //Opsi tambahan : cache selama 5 menit, tidak refetch saat window focus
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