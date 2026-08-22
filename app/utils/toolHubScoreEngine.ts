// Maps a ScoringTool's computed score to a tier id, matched against ToolAdviceGroup.tier
// in data/scoring-tools.json to highlight the band that applies to the current result.
export function getScoreToolTier(
  toolId: string,
  totalScore: number,
  partScores?: Record<string, number>
): string | undefined {
  switch (toolId) {
    case "madrs":
      if (totalScore <= 6) return "none";
      if (totalScore <= 19) return "mild";
      if (totalScore <= 34) return "moderate";
      return "severe";
    case "gad-7":
      if (totalScore <= 4) return "minimal";
      if (totalScore <= 9) return "mild";
      if (totalScore <= 14) return "moderate";
      return "severe";
    case "audit":
      if (totalScore <= 7) return "low";
      if (totalScore <= 15) return "risky";
      if (totalScore <= 19) return "harmful";
      return "dependence";
    case "cage":
      if (totalScore <= 0) return "negative";
      if (totalScore === 1) return "borderline";
      return "significant";
    case "ciwa-ar":
      if (totalScore <= 8) return "minimal";
      if (totalScore <= 19) return "mild-mod";
      return "severe";
    case "ciwa-b":
      if (totalScore <= 20) return "mild";
      if (totalScore <= 40) return "moderate";
      if (totalScore <= 60) return "severe";
      return "very-severe";
    case "eular-ra-2010":
      return totalScore >= 6 ? "ra-likely" : "ra-unlikely";
    case "eular-pmr-2012":
      return totalScore >= 4 ? "pmr-likely" : "pmr-unlikely";
    case "alvarado":
      if (totalScore <= 4) return "unlikely";
      if (totalScore <= 6) return "possible";
      if (totalScore <= 8) return "probable";
      return "highly-likely";
    case "asrs": {
      const partA = partScores?.a ?? 0;
      return partA >= 4 ? "partA-high" : "partA-low";
    }
    default:
      return undefined;
  }
}
