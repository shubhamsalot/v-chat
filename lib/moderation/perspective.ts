export interface ModerationResult {
  flagged: boolean;
  score: number;
  reason?: string;
  filteredText: string;
}

const TOXIC_PATTERNS = [
  /\b(kys|kill\s*your\s*self|die|murder|hang\s*your\s*self)\b/i,
  /\b(slut|whore|bitch|cunt|nigger|faggot|retard|chink|kike)\b/i,
  /\b(rape|assault|stab|shoot\s*you)\b/i,
  /\b(nude|send\s*nudes|cp|pedophil|child\s*porn)\b/i,
];

export async function analyzeTextToxicity(text: string): Promise<ModerationResult> {
  const apiKey = process.env.PERSPECTIVE_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment: { text },
            languages: ["en"],
            requestedAttributes: {
              TOXICITY: {},
              SEVERE_TOXICITY: {},
              THREAT: {},
              INSULT: {},
              IDENTITY_ATTACK: {},
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const toxicity = data.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
        const severeToxicity = data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value ?? 0;
        const threat = data.attributeScores?.THREAT?.summaryScore?.value ?? 0;

        const maxScore = Math.max(toxicity, severeToxicity, threat);
        const flagged = maxScore >= 0.7;

        return {
          flagged,
          score: maxScore,
          reason: flagged ? (threat > 0.6 ? "threat" : "toxic_language") : undefined,
          filteredText: flagged ? "[Message removed by moderation]" : text,
        };
      }
    } catch (err) {
      console.warn("[Perspective API] Error calling API, falling back to heuristic filter:", err);
    }
  }

  // Heuristic / Local Fallback rule-based filter
  let isToxic = false;
  let detectedReason = "";
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(text)) {
      isToxic = true;
      detectedReason = "prohibited_content";
      break;
    }
  }

  return {
    flagged: isToxic,
    score: isToxic ? 0.95 : 0.05,
    reason: isToxic ? detectedReason : undefined,
    filteredText: isToxic ? "[Message removed by moderation]" : text,
  };
}
