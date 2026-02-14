import { useQuery } from '@tanstack/react-query';
import { fetchStockData } from '../lib/yahoo';
import type { CandleData, StockQuery } from '../lib/types';

export function useStockData(query: StockQuery | null) {
  return useQuery<CandleData[]>({
    queryKey: ['stockData', query?.symbol, query?.range, query?.interval],
    queryFn: () => fetchStockData(query!),
    enabled: !!query?.symbol,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
