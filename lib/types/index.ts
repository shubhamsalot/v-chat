export type MatchEndReason = "next" | "stop" | "timeout" | "disconnect" | "report";

export type Gender = "all" | "male" | "female" | "other";

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash?: string;
  displayName: string;
  avatarUrl: string;
  country: string;
  gender: Gender;
  bio?: string;
  karmaScore: number;
  ageConfirmed: boolean;
  isAnonymous: boolean;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  country?: string;
  gender?: Gender;
  bio?: string;
  karmaScore?: number;
  createdAt: number;
  ageConfirmed: boolean;
  isAnonymous: boolean;
}

export interface QueueEntry {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  country?: string;
  gender?: Gender;
  preferredCountry?: string;
  preferredGender?: Gender;
  interests: string[];
  joinedAt: number;
  status: "waiting" | "matched";
  matchedWith?: string;
  matchId?: string;
  region?: string;
}

export interface MatchDoc {
  matchId: string;
  participants: [string, string];
  createdAt: number;
  endedAt: number | null;
  endReason: MatchEndReason | null;
  participantDetails?: Record<string, {
    displayName: string;
    avatarUrl?: string;
    country?: string;
    gender?: Gender;
  }>;
}

export interface SignalingCandidate {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

export interface ReactionEvent {
  id: string;
  senderUid: string;
  emoji: string;
  timestamp: number;
}

export interface SignalingState {
  offer?: { sdp: string; type: "offer" };
  answer?: { sdp: string; type: "answer" };
  candidates?: Record<string, SignalingCandidate[]>;
  presence?: Record<string, { connected: boolean; lastSeen: number }>;
  reactions?: ReactionEvent[];
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  text: string;
  timestamp: number;
  isFlagged?: boolean;
}

export type ReportReason =
  | "nudity"
  | "harassment"
  | "minor_concern"
  | "spam"
  | "other";

export interface ReportDoc {
  reportId: string;
  reporterUid: string;
  reportedUid: string;
  matchId: string;
  reason: ReportReason;
  evidenceFrameUrl?: string;
  createdAt: number;
  reviewStatus: "pending" | "actioned" | "dismissed";
}

export interface BanDoc {
  uid: string;
  strikeCount: number;
  reason: string;
  bannedAt: number;
  isPermanent: boolean;
}

export interface ConnectionRecord {
  id: string;
  peerUid: string;
  peerDisplayName: string;
  peerAvatarUrl?: string;
  peerCountry?: string;
  connectedAt: number;
  durationSeconds?: number;
}
