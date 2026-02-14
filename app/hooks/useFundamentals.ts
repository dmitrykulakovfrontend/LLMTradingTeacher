import { useQuery } from '@tanstack/react-query';
import { fetchFundamentals } from '../lib/fundamentals';
import type { FundamentalsData } from '../lib/types';

export function useFundamentals(symbol: string | null, fmpApiKey?: string | null) {
  return useQuery<FundamentalsData>({
    queryKey: ['fundamentals', symbol, fmpApiKey ?? 'yahoo'],
    queryFn: () => fetchFundamentals(symbol!, fmpApiKey),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
