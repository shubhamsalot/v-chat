export interface UserProfile {
  uid: string;
  displayName: string;
  createdAt: number;
  ageConfirmed: boolean;
  isAnonymous: boolean;
}

export interface QueueEntry {
  uid: string;
  displayName: string;
  interests: string[];
  joinedAt: number;
  status: "waiting" | "matched";
  matchedWith?: string;
  region?: string;
}

export interface MatchSession {
  id: string;
  participants: [string, string];
  createdAt: number;
  endedAt: number | null;
  endReason: "next" | "stop" | "disconnected" | "reported" | null;
}

export interface SignalingOfferAnswer {
  sdp: string;
  type: "offer" | "answer";
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface SignalingData {
  offer?: SignalingOfferAnswer;
  answer?: SignalingOfferAnswer;
  candidates?: {
    [uid: string]: { [id: string]: IceCandidatePayload };
  };
  presence?: {
    [uid: string]: {
      connected: boolean;
      lastSeen: number;
    };
  };
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: number;
  flagged?: boolean;
}

export type ReportReason = "nudity" | "harassment" | "minor_concern" | "spam" | "other";

export interface ReportDoc {
  id?: string;
  reporterUid: string;
  reportedUid: string;
  matchId: string;
  reason: ReportReason;
  evidenceFrameUrl?: string | null;
  createdAt: number;
  reviewStatus: "pending" | "reviewed" | "dismissed" | "actioned";
}

export interface BanDoc {
  uid: string;
  strikeCount: number;
  bannedAt: number;
  reason: string;
  isSuspended: boolean;
}
