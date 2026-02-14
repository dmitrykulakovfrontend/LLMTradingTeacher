import { useQuery } from '@tanstack/react-query';
import { fetchEtfHoldings, type EtfHoldingsFetchResult } from '../lib/etfHoldings';

export function useEtfHoldings(symbols: string[]) {
  const sortedSymbols = [...symbols].sort();

  return useQuery<EtfHoldingsFetchResult>({
    queryKey: ['etfHoldings', ...sortedSymbols],
    queryFn: () => fetchEtfHoldings(sortedSymbols),
    enabled: sortedSymbols.length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
