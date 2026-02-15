import type {
  ExposureBreakdown,
  SectorData,
  SectorExposure,
  SectorBreakdownResult,
  ConcentrationWarning,
} from "./types";

// GICS sector color palette - distinct base colors with variations for 10+ sectors
// Alternates warm/cool, avoids adjacent similar shades
const SECTOR_COLORS: Record<string, string> = {
  "Technology": "#0099ff", // Bright Blue
  "Financial Services": "#00d9ff", // Cyan
  "Healthcare": "#00ff88", // Green
  "Consumer Cyclical": "#ff6b35", // Orange
  "Industrials": "#8b5cf6", // Purple
  "Communication Services": "#f43f5e", // Rose
  "Consumer Defensive": "#10b981", // Emerald
  "Energy": "#fbbf24", // Amber
  "Basic Materials": "#ec4899", // Pink
  "Real Estate": "#14b8a6", // Teal
  "Utilities": "#6366f1", // Indigo
  "Unknown/Other": "#666666", // Gray
};

export function calculateSectorBreakdown(
  exposures: ExposureBreakdown[],
  sectorData: SectorData[],
): SectorBreakdownResult {
  const sectorMap = new Map<string, SectorData>();
  for (const data of sectorData) {
    sectorMap.set(data.symbol, data);
  }

  // Group exposures by sector
  const sectorGroups = new Map<
    string,
    Array<{ symbol: string; companyName: string; exposure: number }>
  >();

  let totalCategorized = 0;

  for (const exp of exposures) {
    const sectorInfo = sectorMap.get(exp.symbol);
    const sector = sectorInfo?.sector || "Unknown/Other";

    if (!sectorGroups.has(sector)) {
      sectorGroups.set(sector, []);
    }

    sectorGroups.get(sector)!.push({
      symbol: exp.symbol,
      companyName: exp.companyName,
      exposure: exp.totalExposure,
    });

    if (sectorInfo?.sector) {
      totalCategorized += exp.totalExposure;
    }
  }

  // Build sector exposures
  const sectors: SectorExposure[] = [];
  for (const [sector, companies] of sectorGroups) {
    const totalExposure = companies.reduce((sum, c) => sum + c.exposure, 0);
    sectors.push({
      sector,
      totalExposure,
      companies: companies.sort((a, b) => b.exposure - a.exposure),
      color: SECTOR_COLORS[sector] || "#666666",
    });
  }

  // Sort by total exposure descending
  sectors.sort((a, b) => b.totalExposure - a.totalExposure);

  // Generate warnings
  const warnings = generateSectorWarnings(sectors);

  return {
    sectors,
    warnings,
    totalCategorized,
  };
}

function generateSectorWarnings(
  sectors: SectorExposure[],
): ConcentrationWarning[] {
  const warnings: ConcentrationWarning[] = [];

  // Warning 1: Single sector > 40% = HIGH
  // Warning 2: Single sector > 25% = MEDIUM
  for (const sector of sectors) {
    if (sector.totalExposure > 40 && sector.sector !== "Unknown/Other") {
      warnings.push({
        type: "sector_concentration",
        severity: "high",
        message: `${sector.sector} represents ${sector.totalExposure.toFixed(1)}% of your portfolio. Consider diversifying across sectors.`,
        symbols: sector.companies.map((c) => c.symbol),
        value: sector.totalExposure,
      });
    } else if (sector.totalExposure > 25 && sector.sector !== "Unknown/Other") {
      warnings.push({
        type: "sector_concentration",
        severity: "medium",
        message: `${sector.sector} represents ${sector.totalExposure.toFixed(1)}% of your portfolio. Monitor sector concentration.`,
        symbols: sector.companies.map((c) => c.symbol),
        value: sector.totalExposure,
      });
    }
  }

  return warnings;
}
