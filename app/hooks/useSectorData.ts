import { useQuery } from "@tanstack/react-query";
import {
  fetchSectorData,
  type SectorDataFetchResult,
} from "../lib/fetchSectorData";

export function useSectorData(symbols: string[]) {
  const sortedSymbols = [...symbols].sort();

  return useQuery<SectorDataFetchResult>({
    queryKey: ["sectorData", ...sortedSymbols],
    queryFn: () => fetchSectorData(sortedSymbols),
    enabled: sortedSymbols.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
