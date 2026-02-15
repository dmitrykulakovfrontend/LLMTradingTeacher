import type { SectorData } from "./types";

export interface SectorDataFetchResult {
  data: SectorData[];
  errors: Array<{ symbol: string; error: string }>;
}

export async function fetchSectorData(
  symbols: string[],
): Promise<SectorDataFetchResult> {
  if (symbols.length === 0) {
    return { data: [], errors: [] };
  }

  const uniqueSymbols = [...new Set(symbols)];
  const params = new URLSearchParams({
    symbols: uniqueSymbols.join(","),
  });

  const response = await fetch(`/api/sector-data?${params}`);

  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ error: "Failed to fetch sector data" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
