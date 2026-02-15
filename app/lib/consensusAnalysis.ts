import type { AnalystId, ExtractedSignals, ConsensusResult } from "./types";
import { ANALYSTS } from "./analystPrompts";

/**
 * Consensus Analysis for Multi-Analyst Technical Analysis
 *
 * Extracts structured signals from analyst text responses and calculates
 * agreement/disagreement across analysts.
 */

// Common chart patterns to detect
const CHART_PATTERNS = [
  "head and shoulders",
  "inverse head and shoulders",
  "double top",
  "double bottom",
  "triple top",
  "triple bottom",
  "ascending triangle",
  "descending triangle",
  "symmetrical triangle",
  "rising wedge",
  "falling wedge",
  "bull flag",
  "bear flag",
  "pennant",
  "rectangle",
  "channel",
  "cup and handle",
  "doji",
  "hammer",
  "hanging man",
  "shooting star",
  "inverted hammer",
  "engulfing",
  "morning star",
  "evening star",
  "piercing pattern",
  "dark cloud cover",
  "three white soldiers",
  "three black crows",
  "harami",
  "tweezer",
];

// Bullish keywords
const BULLISH_KEYWORDS = [
  "bullish",
  "buy",
  "long",
  "uptrend",
  "upside",
  "higher",
  "breakout",
  "support holding",
  "accumulation",
  "positive",
  "strong momentum",
  "oversold",
];

// Bearish keywords
const BEARISH_KEYWORDS = [
  "bearish",
  "sell",
  "short",
  "downtrend",
  "downside",
  "lower",
  "breakdown",
  "resistance holding",
  "distribution",
  "negative",
  "weak momentum",
  "overbought",
];

// Neutral keywords
const NEUTRAL_KEYWORDS = [
  "neutral",
  "sideways",
  "range-bound",
  "consolidation",
  "mixed",
  "uncertain",
  "wait",
  "indecision",
];

// Confidence keywords (strength modifiers)
const HIGH_CONFIDENCE = ["strong", "very", "highly", "significant", "clear", "definite"];
const LOW_CONFIDENCE = ["weak", "slight", "minor", "possible", "potential", "uncertain"];

/**
 * Extract structured signals from analyst text using keyword matching
 */
export function extractSignalsFromText(
  analystId: AnalystId,
  analysisText: string,
): ExtractedSignals {
  const lowerText = analysisText.toLowerCase();

  // Extract sentiment
  const sentiment = extractSentiment(lowerText);

  // Extract confidence level (0-100)
  const confidence = extractConfidence(lowerText, sentiment);

  // Extract patterns mentioned
  const patterns = extractPatterns(lowerText);

  // Extract support/resistance levels
  const keyLevels = extractKeyLevels(analysisText);

  // Extract price targets
  const priceTargets = extractPriceTargets(analysisText);

  return {
    analystId,
    sentiment,
    confidence,
    patterns,
    keyLevels,
    priceTargets,
  };
}

/**
 * Determine overall sentiment from text
 */
function extractSentiment(lowerText: string): "bullish" | "bearish" | "neutral" {
  // Count keyword matches
  const bullishCount = BULLISH_KEYWORDS.filter((kw) => lowerText.includes(kw)).length;
  const bearishCount = BEARISH_KEYWORDS.filter((kw) => lowerText.includes(kw)).length;
  const neutralCount = NEUTRAL_KEYWORDS.filter((kw) => lowerText.includes(kw)).length;

  // If neutral keywords dominate, return neutral
  if (neutralCount > bullishCount && neutralCount > bearishCount) {
    return "neutral";
  }

  // If bullish and bearish are close, it's mixed/neutral
  if (Math.abs(bullishCount - bearishCount) <= 1 && bullishCount > 0 && bearishCount > 0) {
    return "neutral";
  }

  // Otherwise return the dominant sentiment
  if (bullishCount > bearishCount) {
    return "bullish";
  } else if (bearishCount > bullishCount) {
    return "bearish";
  }

  return "neutral";
}

/**
 * Extract confidence level based on keywords and context
 */
function extractConfidence(lowerText: string, sentiment: string): number {
  let baseConfidence = 50; // Default moderate confidence

  // Count high confidence modifiers
  const highConfCount = HIGH_CONFIDENCE.filter((kw) => lowerText.includes(kw)).length;
  const lowConfCount = LOW_CONFIDENCE.filter((kw) => lowerText.includes(kw)).length;

  // Adjust based on modifiers
  baseConfidence += highConfCount * 10;
  baseConfidence -= lowConfCount * 10;

  // If sentiment is neutral, lower confidence
  if (sentiment === "neutral") {
    baseConfidence = Math.min(baseConfidence, 60);
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, baseConfidence));
}

/**
 * Extract chart patterns mentioned in text
 */
function extractPatterns(lowerText: string): string[] {
  const foundPatterns: string[] = [];

  for (const pattern of CHART_PATTERNS) {
    if (lowerText.includes(pattern)) {
      foundPatterns.push(pattern);
    }
  }

  return foundPatterns;
}

/**
 * Extract support and resistance levels from text
 */
function extractKeyLevels(text: string): {
  support: number[];
  resistance: number[];
} {
  const support: number[] = [];
  const resistance: number[] = [];

  // Regex to match price levels (e.g., $150, $150.50, 150)
  const priceRegex = /\$?(\d+\.?\d*)/g;

  // Find support levels
  const supportMatches = text.match(/support\s+(?:at\s+|around\s+|near\s+)?\$?(\d+\.?\d*)/gi);
  if (supportMatches) {
    for (const match of supportMatches) {
      const priceMatch = match.match(/\$?(\d+\.?\d*)/);
      if (priceMatch) {
        support.push(parseFloat(priceMatch[1]));
      }
    }
  }

  // Find resistance levels
  const resistanceMatches = text.match(
    /resistance\s+(?:at\s+|around\s+|near\s+)?\$?(\d+\.?\d*)/gi,
  );
  if (resistanceMatches) {
    for (const match of resistanceMatches) {
      const priceMatch = match.match(/\$?(\d+\.?\d*)/);
      if (priceMatch) {
        resistance.push(parseFloat(priceMatch[1]));
      }
    }
  }

  return {
    support: [...new Set(support)].sort((a, b) => b - a), // Remove duplicates, sort descending
    resistance: [...new Set(resistance)].sort((a, b) => a - b), // Remove duplicates, sort ascending
  };
}

/**
 * Extract price targets from text
 */
function extractPriceTargets(text: string): {
  upside?: number;
  downside?: number;
} {
  const priceTargets: { upside?: number; downside?: number } = {};

  // Look for upside targets
  const upsideMatches = text.match(
    /(?:upside\s+target|target\s+price|price\s+target).*?\$?(\d+\.?\d*)/gi,
  );
  if (upsideMatches && upsideMatches.length > 0) {
    const priceMatch = upsideMatches[0].match(/\$?(\d+\.?\d*)/);
    if (priceMatch) {
      priceTargets.upside = parseFloat(priceMatch[1]);
    }
  }

  // Look for downside targets
  const downsideMatches = text.match(/downside\s+target.*?\$?(\d+\.?\d*)/gi);
  if (downsideMatches && downsideMatches.length > 0) {
    const priceMatch = downsideMatches[0].match(/\$?(\d+\.?\d*)/);
    if (priceMatch) {
      priceTargets.downside = parseFloat(priceMatch[1]);
    }
  }

  return priceTargets;
}

/**
 * Calculate consensus across multiple analysts
 */
export function calculateConsensus(signals: ExtractedSignals[]): ConsensusResult {
  if (signals.length === 0) {
    return {
      overallSentiment: "neutral",
      agreementPercentage: 0,
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      commonPatterns: [],
      keyAgreements: [],
      keyDisagreements: [],
      confidenceScore: 0,
    };
  }

  // Count sentiment distribution
  const bullishCount = signals.filter((s) => s.sentiment === "bullish").length;
  const bearishCount = signals.filter((s) => s.sentiment === "bearish").length;
  const neutralCount = signals.filter((s) => s.sentiment === "neutral").length;

  // Determine overall sentiment
  const overallSentiment = determineOverallSentiment(
    bullishCount,
    bearishCount,
    neutralCount,
    signals.length,
  );

  // Calculate agreement percentage
  const agreementPercentage = calculateAgreementPercentage(
    bullishCount,
    bearishCount,
    neutralCount,
    signals.length,
  );

  // Find common patterns (mentioned by 2+ analysts)
  const commonPatterns = findCommonPatterns(signals);

  // Generate key agreements and disagreements
  const { keyAgreements, keyDisagreements } = generateAgreementsAndDisagreements(
    signals,
    overallSentiment,
    commonPatterns,
  );

  // Calculate confidence score
  const confidenceScore = calculateConfidenceScore(
    agreementPercentage,
    commonPatterns.length,
    signals,
  );

  return {
    overallSentiment,
    agreementPercentage,
    bullishCount,
    bearishCount,
    neutralCount,
    commonPatterns,
    keyAgreements,
    keyDisagreements,
    confidenceScore,
  };
}

/**
 * Determine overall sentiment based on counts
 */
function determineOverallSentiment(
  bullishCount: number,
  bearishCount: number,
  neutralCount: number,
  totalCount: number,
): "bullish" | "bearish" | "neutral" | "mixed" {
  // If majority are neutral
  if (neutralCount > bullishCount && neutralCount > bearishCount) {
    return "neutral";
  }

  // If bullish and bearish are very close (within 1), it's mixed
  if (Math.abs(bullishCount - bearishCount) <= 1 && bullishCount > 0 && bearishCount > 0) {
    return "mixed";
  }

  // If clear majority (60%+)
  const majorityThreshold = totalCount * 0.6;
  if (bullishCount >= majorityThreshold) {
    return "bullish";
  }
  if (bearishCount >= majorityThreshold) {
    return "bearish";
  }

  // Otherwise, it's mixed
  if (bullishCount > bearishCount) {
    return bullishCount >= totalCount * 0.5 ? "bullish" : "mixed";
  } else if (bearishCount > bullishCount) {
    return bearishCount >= totalCount * 0.5 ? "bearish" : "mixed";
  }

  return "neutral";
}

/**
 * Calculate agreement percentage
 */
function calculateAgreementPercentage(
  bullishCount: number,
  bearishCount: number,
  neutralCount: number,
  totalCount: number,
): number {
  if (totalCount === 0) return 0;

  // Find the maximum count
  const maxCount = Math.max(bullishCount, bearishCount, neutralCount);

  // If all agree: 100%
  if (maxCount === totalCount) {
    return 100;
  }

  // Calculate percentage of majority
  const majorityPercentage = (maxCount / totalCount) * 100;

  // Adjust based on how close the split is
  if (maxCount >= totalCount * 0.8) {
    // 80%+ agreement: 80-100%
    return Math.round(80 + (majorityPercentage - 80) * 2);
  } else if (maxCount >= totalCount * 0.6) {
    // 60-80% agreement: 60-80%
    return Math.round(majorityPercentage);
  } else if (maxCount >= totalCount * 0.5) {
    // 50-60% agreement: 40-60%
    return Math.round(40 + (majorityPercentage - 50) * 2);
  } else {
    // < 50% agreement: 30-40%
    return Math.round(30 + majorityPercentage / 2);
  }
}

/**
 * Find patterns mentioned by multiple analysts
 */
function findCommonPatterns(
  signals: ExtractedSignals[],
): Array<{ pattern: string; mentionedBy: AnalystId[] }> {
  const patternMap = new Map<string, AnalystId[]>();

  // Count pattern mentions
  for (const signal of signals) {
    for (const pattern of signal.patterns) {
      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, []);
      }
      patternMap.get(pattern)!.push(signal.analystId);
    }
  }

  // Filter to patterns mentioned by 2+ analysts
  const commonPatterns: Array<{ pattern: string; mentionedBy: AnalystId[] }> = [];
  for (const [pattern, analysts] of patternMap.entries()) {
    if (analysts.length >= 2) {
      commonPatterns.push({ pattern, mentionedBy: analysts });
    }
  }

  // Sort by number of mentions (descending)
  commonPatterns.sort((a, b) => b.mentionedBy.length - a.mentionedBy.length);

  return commonPatterns;
}

/**
 * Generate key agreements and disagreements
 */
function generateAgreementsAndDisagreements(
  signals: ExtractedSignals[],
  overallSentiment: string,
  commonPatterns: Array<{ pattern: string; mentionedBy: AnalystId[] }>,
): { keyAgreements: string[]; keyDisagreements: string[] } {
  const keyAgreements: string[] = [];
  const keyDisagreements: string[] = [];

  // Agreement on sentiment
  const bullishCount = signals.filter((s) => s.sentiment === "bullish").length;
  const bearishCount = signals.filter((s) => s.sentiment === "bearish").length;
  const neutralCount = signals.filter((s) => s.sentiment === "neutral").length;

  if (overallSentiment !== "mixed") {
    const majorityCount = Math.max(bullishCount, bearishCount, neutralCount);
    const percentage = Math.round((majorityCount / signals.length) * 100);
    keyAgreements.push(`${majorityCount}/${signals.length} analysts agree on ${overallSentiment} outlook (${percentage}%)`);
  }

  // Common patterns
  if (commonPatterns.length > 0) {
    for (const cp of commonPatterns.slice(0, 3)) {
      // Top 3 patterns
      const analystNames = cp.mentionedBy.map((id) => ANALYSTS[id].name.split(" ")[1] || ANALYSTS[id].name);
      keyAgreements.push(
        `${cp.mentionedBy.length}/${signals.length} analysts identified ${cp.pattern} (${analystNames.join(", ")})`,
      );
    }
  }

  // Check for disagreements
  if (bullishCount > 0 && bearishCount > 0) {
    const bullishAnalysts = signals
      .filter((s) => s.sentiment === "bullish")
      .map((s) => ANALYSTS[s.analystId].name.split(" ")[1] || ANALYSTS[s.analystId].name);
    const bearishAnalysts = signals
      .filter((s) => s.sentiment === "bearish")
      .map((s) => ANALYSTS[s.analystId].name.split(" ")[1] || ANALYSTS[s.analystId].name);

    keyDisagreements.push(
      `Directional disagreement: ${bullishAnalysts.join(", ")} see bullish, ${bearishAnalysts.join(", ")} see bearish`,
    );
  }

  // Check for unique patterns (only mentioned by one analyst)
  const allPatterns = new Map<string, AnalystId[]>();
  for (const signal of signals) {
    for (const pattern of signal.patterns) {
      if (!allPatterns.has(pattern)) {
        allPatterns.set(pattern, []);
      }
      allPatterns.get(pattern)!.push(signal.analystId);
    }
  }

  const uniquePatterns = Array.from(allPatterns.entries())
    .filter(([, analysts]) => analysts.length === 1)
    .slice(0, 2); // Top 2 unique patterns

  for (const [pattern, analysts] of uniquePatterns) {
    const analystName = ANALYSTS[analysts[0]].name.split(" ")[1] || ANALYSTS[analysts[0]].name;
    keyDisagreements.push(`Only ${analystName} identified ${pattern}`);
  }

  return { keyAgreements, keyDisagreements };
}

/**
 * Calculate overall confidence score
 */
function calculateConfidenceScore(
  agreementPercentage: number,
  commonPatternsCount: number,
  signals: ExtractedSignals[],
): number {
  let confidenceScore = agreementPercentage;

  // Boost for common patterns
  if (commonPatternsCount >= 3) {
    confidenceScore += 10;
  } else if (commonPatternsCount >= 2) {
    confidenceScore += 5;
  }

  // Check if key levels align (support/resistance within 2% of each other)
  const hasAlignedLevels = checkLevelAlignment(signals);
  if (hasAlignedLevels) {
    confidenceScore += 10;
  }

  // Check for contradictory signals (bullish AND bearish with high confidence)
  const hasContradiction = signals.some(
    (s) => s.sentiment === "bullish" && s.confidence > 70,
  ) && signals.some((s) => s.sentiment === "bearish" && s.confidence > 70);

  if (hasContradiction) {
    confidenceScore -= 20;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(confidenceScore)));
}

/**
 * Check if support/resistance levels align across analysts
 */
function checkLevelAlignment(signals: ExtractedSignals[]): boolean {
  const allSupport = signals.flatMap((s) => s.keyLevels.support);
  const allResistance = signals.flatMap((s) => s.keyLevels.resistance);

  // Check if any support levels are within 2% of each other
  for (let i = 0; i < allSupport.length; i++) {
    for (let j = i + 1; j < allSupport.length; j++) {
      const diff = Math.abs(allSupport[i] - allSupport[j]);
      const avg = (allSupport[i] + allSupport[j]) / 2;
      if (diff / avg < 0.02) {
        // Within 2%
        return true;
      }
    }
  }

  // Check if any resistance levels are within 2% of each other
  for (let i = 0; i < allResistance.length; i++) {
    for (let j = i + 1; j < allResistance.length; j++) {
      const diff = Math.abs(allResistance[i] - allResistance[j]);
      const avg = (allResistance[i] + allResistance[j]) / 2;
      if (diff / avg < 0.02) {
        // Within 2%
        return true;
      }
    }
  }

  return false;
}
