import { db, rtdb } from "./firebase";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment 
} from "firebase/firestore";
import { ReportReason, ReportDoc, ChatMessage } from "@/types";

// Blocklist / heuristic toxicity patterns for immediate client-side filtering + Perspective API
const TOXIC_PATTERNS = [
  /\b(kill\s+yourself|kys|die)\b/i,
  /\b(hate\s+speech|slur|fag|nigger|cunt)\b/i,
  /\b(doxx|swat|threat)\b/i,
];

/**
 * Validates text message through moderation pipeline
 */
export async function moderateMessageText(text: string): Promise<{ isToxic: boolean; sanitizedText: string }> {
  // Check heuristic patterns
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isToxic: true,
        sanitizedText: "[Message removed for violating community guidelines]",
      };
    }
  }

  // Perspective API integration point (if API key is present)
  if (process.env.NEXT_PUBLIC_PERSPECTIVE_API_KEY) {
    try {
      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${process.env.NEXT_PUBLIC_PERSPECTIVE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comment: { text },
            requestedAttributes: { TOXICITY: {}, SEVERE_TOXICITY: {}, IDENTITY_ATTACK: {}, THREAT: {} },
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const toxicity = data.attributeScores?.TOXICITY?.summaryScore?.value || 0;
        const severeToxicity = data.attributeScores?.SEVERE_TOXICITY?.summaryScore?.value || 0;
        const threat = data.attributeScores?.THREAT?.summaryScore?.value || 0;

        if (toxicity > 0.75 || severeToxicity > 0.6 || threat > 0.5) {
          return {
            isToxic: true,
            sanitizedText: "[Message removed for violating community guidelines]",
          };
        }
      }
    } catch (e) {
      console.warn("Perspective API check error:", e);
    }
  }

  return {
    isToxic: false,
    sanitizedText: text,
  };
}

/**
 * Submits a safety report for a peer
 */
export async function submitSafetyReport(params: {
  reporterUid: string;
  reportedUid: string;
  matchId: string;
  reason: ReportReason;
  evidenceFrameUrl?: string | null;
}): Promise<void> {
  const reportDoc: ReportDoc = {
    reporterUid: params.reporterUid,
    reportedUid: params.reportedUid,
    matchId: params.matchId,
    reason: params.reason,
    evidenceFrameUrl: params.evidenceFrameUrl || null,
    createdAt: Date.now(),
    reviewStatus: "pending",
  };

  // 1. Write to /reports collection
  await addDoc(collection(db, "reports"), reportDoc);

  // 2. Process strike & auto-suspension on the reported user
  const banRef = doc(db, "bans", params.reportedUid);
  const banSnap = await getDoc(banRef);

  const immediateSuspensionReasons: ReportReason[] = ["nudity", "minor_concern"];
  const shouldImmediateSuspend = immediateSuspensionReasons.includes(params.reason);

  if (banSnap.exists()) {
    const currentStrikes = (banSnap.data().strikeCount || 0) + 1;
    await updateDoc(banRef, {
      strikeCount: increment(1),
      isSuspended: shouldImmediateSuspend || currentStrikes >= 3,
      reason: params.reason,
      lastReportedAt: Date.now(),
    });
  } else {
    await setDoc(banRef, {
      uid: params.reportedUid,
      strikeCount: 1,
      isSuspended: shouldImmediateSuspend,
      reason: params.reason,
      bannedAt: Date.now(),
    });
  }
}
