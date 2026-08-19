import {
  QueueEntry,
  MatchDoc,
  BanDoc,
  ReportDoc,
  UserAccount,
  UserProfile,
  Gender,
  ReactionEvent,
  ConnectionRecord,
} from "@/lib/types";

// In-memory persistent state store for server runtime & dev environment
interface ServerState {
  accounts: Map<string, UserAccount>; // keyed by email
  users: Map<string, UserAccount>;    // keyed by id / uid
  queue: Map<string, QueueEntry>;
  matches: Map<string, MatchDoc>;
  bans: Map<string, BanDoc>;
  reports: Map<string, ReportDoc>;
  history: Map<string, ConnectionRecord[]>; // keyed by uid
  signaling: Map<
    string,
    {
      offer?: { sdp: string; type: "offer" };
      answer?: { sdp: string; type: "answer" };
      candidates: Record<
        string,
        Array<{ candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }>
      >;
      presence: Record<string, { connected: boolean; lastSeen: number }>;
      messages: Array<{
        id: string;
        senderUid: string;
        senderName: string;
        text: string;
        timestamp: number;
        isFlagged?: boolean;
      }>;
      reactions: ReactionEvent[];
    }
  >;
}

// Global server singleton
const globalState: ServerState = (globalThis as any).__vchat_state || {
  accounts: new Map(),
  users: new Map(),
  queue: new Map(),
  matches: new Map(),
  bans: new Map(),
  reports: new Map(),
  history: new Map(),
  signaling: new Map(),
};
(globalThis as any).__vchat_state = globalState;

// Simple deterministic hash for password credentials in memory
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}_${password.length * 31}`;
}

export const matchmakingStore = {
  // Account Registration
  register(data: {
    email: string;
    password: string;
    displayName: string;
    country?: string;
    gender?: Gender;
    avatarUrl?: string;
  }): { success: boolean; error?: string; account?: UserAccount } {
    const emailNorm = data.email.trim().toLowerCase();
    if (globalState.accounts.has(emailNorm)) {
      return { success: false, error: "An account with this email already exists." };
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const account: UserAccount = {
      id,
      email: emailNorm,
      passwordHash: hashPassword(data.password),
      displayName: data.displayName.trim() || "V-Chatter",
      avatarUrl:
        data.avatarUrl ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(id)}`,
      country: data.country || "GLOBAL",
      gender: data.gender || "all",
      karmaScore: 100,
      ageConfirmed: true,
      isAnonymous: false,
      createdAt: Date.now(),
    };

    globalState.accounts.set(emailNorm, account);
    globalState.users.set(id, account);

    return { success: true, account };
  },

  // Account Login
  login(email: string, password: string): { success: boolean; error?: string; account?: UserAccount } {
    const emailNorm = email.trim().toLowerCase();
    const account = globalState.accounts.get(emailNorm);
    if (!account) {
      return { success: false, error: "Invalid email or password." };
    }

    if (account.passwordHash !== hashPassword(password)) {
      return { success: false, error: "Invalid email or password." };
    }

    return { success: true, account };
  },

  // User Profile
  setUser(
    uid: string,
    profile: {
      displayName: string;
      ageConfirmed: boolean;
      isAnonymous: boolean;
      country?: string;
      gender?: Gender;
      avatarUrl?: string;
      bio?: string;
    }
  ): UserAccount {
    let existing = globalState.users.get(uid);
    if (!existing) {
      existing = {
        id: uid,
        email: `${uid}@guest.v-chat`,
        displayName: profile.displayName || "Stranger",
        avatarUrl:
          profile.avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uid)}`,
        country: profile.country || "GLOBAL",
        gender: profile.gender || "all",
        bio: profile.bio || "",
        karmaScore: 100,
        ageConfirmed: profile.ageConfirmed ?? false,
        createdAt: Date.now(),
        isAnonymous: profile.isAnonymous ?? true,
      };
      globalState.users.set(uid, existing);
    } else {
      if (profile.displayName) existing.displayName = profile.displayName;
      if (profile.country) existing.country = profile.country;
      if (profile.gender) existing.gender = profile.gender;
      if (profile.avatarUrl) existing.avatarUrl = profile.avatarUrl;
      if (profile.bio !== undefined) existing.bio = profile.bio;
      if (profile.ageConfirmed !== undefined) existing.ageConfirmed = profile.ageConfirmed;
    }
    return existing;
  },

  getUser(uid: string): UserAccount | undefined {
    return globalState.users.get(uid);
  },

  setAgeConfirmed(uid: string, confirmed: boolean) {
    let user = globalState.users.get(uid);
    if (!user) {
      user = this.setUser(uid, { displayName: "Stranger", ageConfirmed: confirmed, isAnonymous: true });
    } else {
      user.ageConfirmed = confirmed;
    }
    return user;
  },

  // Bans
  isBanned(uid: string): { banned: boolean; ban?: BanDoc } {
    const ban = globalState.bans.get(uid);
    if (ban) {
      return { banned: true, ban };
    }
    return { banned: false };
  },

  addStrike(uid: string, reason: string) {
    const ban = globalState.bans.get(uid) || {
      uid,
      strikeCount: 0,
      reason,
      bannedAt: Date.now(),
      isPermanent: false,
    };
    ban.strikeCount += 1;
    ban.reason = reason;
    if (ban.strikeCount >= 3 || reason === "minor_concern" || reason === "nudity") {
      ban.isPermanent = true;
      ban.bannedAt = Date.now();
    }
    globalState.bans.set(uid, ban);

    // Decrease karma
    const user = globalState.users.get(uid);
    if (user) {
      user.karmaScore = Math.max(0, user.karmaScore - 35);
    }

    return ban;
  },

  // Matchmaking Queue with OmeTV Filters
  joinQueue(params: {
    uid: string;
    displayName: string;
    interests: string[];
    country?: string;
    gender?: Gender;
    preferredCountry?: string;
    preferredGender?: Gender;
  }): {
    success: boolean;
    error?: string;
    matchId?: string;
    status: "waiting" | "matched";
  } {
    const { uid, displayName, interests, country, gender, preferredCountry, preferredGender } =
      params;

    // 1. Check bans
    const { banned } = this.isBanned(uid);
    if (banned) {
      return {
        success: false,
        error: "Account is suspended due to violations of Community Guidelines.",
        status: "waiting",
      };
    }

    // 2. Enforce Age Gate Server-Side
    const user = globalState.users.get(uid);
    if (!user || user.ageConfirmed !== true) {
      return {
        success: false,
        error: "Age confirmation (18+) is required before joining matchmaking.",
        status: "waiting",
      };
    }

    // Remove any previous queue entry for this user
    globalState.queue.delete(uid);

    // Clean up stale queue entries (> 60s)
    const now = Date.now();
    const queueEntries = Array.from(globalState.queue.entries());
    for (let i = 0; i < queueEntries.length; i++) {
      const [otherUid, entry] = queueEntries[i];
      if (now - entry.joinedAt > 60000) {
        globalState.queue.delete(otherUid);
      }
    }

    const normalizedInterests = interests.map((i) => i.trim().toLowerCase()).filter(Boolean);
    const userCountry = country || user.country || "GLOBAL";
    const userGender = gender || user.gender || "all";
    const prefCountry = preferredCountry || "GLOBAL";
    const prefGender = preferredGender || "all";

    // Match filtering & scoring
    let bestMatchUid: string | null = null;
    let maxScore = -1;

    const activeWaiting = Array.from(globalState.queue.entries());
    for (let i = 0; i < activeWaiting.length; i++) {
      const [candidateUid, candidate] = activeWaiting[i];
      if (candidateUid === uid || candidate.status !== "waiting") continue;

      if (globalState.bans.has(candidateUid)) {
        globalState.queue.delete(candidateUid);
        continue;
      }

      // Country filter check
      if (prefCountry !== "GLOBAL" && candidate.country && candidate.country !== "GLOBAL" && candidate.country !== prefCountry) {
        continue;
      }
      if (candidate.preferredCountry && candidate.preferredCountry !== "GLOBAL" && userCountry !== "GLOBAL" && candidate.preferredCountry !== userCountry) {
        continue;
      }

      // Gender filter check
      if (prefGender !== "all" && candidate.gender && candidate.gender !== "all" && candidate.gender !== prefGender) {
        continue;
      }
      if (candidate.preferredGender && candidate.preferredGender !== "all" && userGender !== "all" && candidate.preferredGender !== userGender) {
        continue;
      }

      // Calculate score
      let score = 10;
      const candidateInterests = candidate.interests.map((ci) => ci.trim().toLowerCase());
      const overlap = normalizedInterests.filter((item) => candidateInterests.includes(item)).length;
      score += overlap * 25;

      if (userCountry === candidate.country && userCountry !== "GLOBAL") {
        score += 15;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatchUid = candidateUid;
      }
    }

    // Match found!
    if (bestMatchUid) {
      const matchedCandidate = globalState.queue.get(bestMatchUid)!;
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const candidateUser = globalState.users.get(bestMatchUid);

      const matchDoc: MatchDoc = {
        matchId,
        participants: [uid, bestMatchUid],
        createdAt: Date.now(),
        endedAt: null,
        endReason: null,
        participantDetails: {
          [uid]: {
            displayName: displayName || user.displayName,
            avatarUrl: user.avatarUrl,
            country: userCountry,
            gender: userGender,
          },
          [bestMatchUid]: {
            displayName: candidateUser?.displayName || matchedCandidate.displayName,
            avatarUrl: candidateUser?.avatarUrl,
            country: candidateUser?.country || matchedCandidate.country,
            gender: candidateUser?.gender || matchedCandidate.gender,
          },
        },
      };

      globalState.matches.set(matchId, matchDoc);

      // Initialize signaling state with reactions
      globalState.signaling.set(matchId, {
        candidates: { [uid]: [], [bestMatchUid]: [] },
        presence: {
          [uid]: { connected: true, lastSeen: Date.now() },
          [bestMatchUid]: { connected: true, lastSeen: Date.now() },
        },
        messages: [],
        reactions: [],
      });

      // Add to connection history
      this.addHistory(uid, {
        id: `conn_${Date.now()}_1`,
        peerUid: bestMatchUid,
        peerDisplayName: candidateUser?.displayName || matchedCandidate.displayName,
        peerAvatarUrl: candidateUser?.avatarUrl,
        peerCountry: candidateUser?.country || matchedCandidate.country,
        connectedAt: Date.now(),
      });
      this.addHistory(bestMatchUid, {
        id: `conn_${Date.now()}_2`,
        peerUid: uid,
        peerDisplayName: displayName || user.displayName,
        peerAvatarUrl: user.avatarUrl,
        peerCountry: userCountry,
        connectedAt: Date.now(),
      });

      // Update candidate queue entry
      matchedCandidate.status = "matched";
      matchedCandidate.matchedWith = uid;
      matchedCandidate.matchId = matchId;

      globalState.queue.delete(uid);
      globalState.queue.delete(bestMatchUid);

      return {
        success: true,
        matchId,
        status: "matched",
      };
    }

    // Add to waiting queue
    const queueEntry: QueueEntry = {
      uid,
      displayName: displayName || user.displayName || "Stranger",
      avatarUrl: user.avatarUrl,
      country: userCountry,
      gender: userGender,
      preferredCountry: prefCountry,
      preferredGender: prefGender,
      interests: normalizedInterests,
      joinedAt: Date.now(),
      status: "waiting",
    };
    globalState.queue.set(uid, queueEntry);

    return {
      success: true,
      status: "waiting",
    };
  },

  pollQueue(uid: string): {
    status: "waiting" | "matched" | "idle";
    matchId?: string;
    matchedWith?: string;
    peerDetails?: { displayName: string; avatarUrl?: string; country?: string; gender?: Gender };
  } {
    const entry = globalState.queue.get(uid);
    if (entry) {
      if (entry.status === "matched" && entry.matchId) {
        const matchId = entry.matchId;
        const matchedWith = entry.matchedWith;
        globalState.queue.delete(uid);

        const match = globalState.matches.get(matchId);
        const peerDetails = matchedWith && match?.participantDetails ? match.participantDetails[matchedWith] : undefined;

        return { status: "matched", matchId, matchedWith, peerDetails };
      }
      return { status: "waiting" };
    }

    const matchesList = Array.from(globalState.matches.entries());
    for (let i = 0; i < matchesList.length; i++) {
      const [matchId, match] = matchesList[i];
      if (match.participants.includes(uid) && !match.endedAt && Date.now() - match.createdAt < 15000) {
        const other = match.participants.find((p) => p !== uid);
        const peerDetails = other && match.participantDetails ? match.participantDetails[other] : undefined;
        return { status: "matched", matchId, matchedWith: other, peerDetails };
      }
    }

    return { status: "idle" };
  },

  leaveQueue(uid: string) {
    globalState.queue.delete(uid);
  },

  getMatch(matchId: string) {
    return globalState.matches.get(matchId);
  },

  endMatch(matchId: string, reason: "next" | "stop" | "timeout" | "disconnect" | "report") {
    const match = globalState.matches.get(matchId);
    if (match && !match.endedAt) {
      match.endedAt = Date.now();
      match.endReason = reason;
      setTimeout(() => {
        globalState.signaling.delete(matchId);
      }, 10000);
    }
  },

  // Signaling & Reactions
  getSignaling(matchId: string) {
    return globalState.signaling.get(matchId);
  },

  setOffer(matchId: string, sdp: string) {
    let sig = globalState.signaling.get(matchId);
    if (!sig) {
      sig = { candidates: {}, presence: {}, messages: [], reactions: [] };
      globalState.signaling.set(matchId, sig);
    }
    sig.offer = { sdp, type: "offer" };
  },

  setAnswer(matchId: string, sdp: string) {
    let sig = globalState.signaling.get(matchId);
    if (!sig) {
      sig = { candidates: {}, presence: {}, messages: [], reactions: [] };
      globalState.signaling.set(matchId, sig);
    }
    sig.answer = { sdp, type: "answer" };
  },

  addCandidate(
    matchId: string,
    uid: string,
    candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null }
  ) {
    let sig = globalState.signaling.get(matchId);
    if (!sig) {
      sig = { candidates: {}, presence: {}, messages: [], reactions: [] };
      globalState.signaling.set(matchId, sig);
    }
    if (!sig.candidates[uid]) {
      sig.candidates[uid] = [];
    }
    sig.candidates[uid].push(candidate);
  },

  updatePresence(matchId: string, uid: string, connected: boolean) {
    const sig = globalState.signaling.get(matchId);
    if (sig) {
      sig.presence[uid] = { connected, lastSeen: Date.now() };
    }
  },

  addMessage(
    matchId: string,
    message: {
      id: string;
      senderUid: string;
      senderName: string;
      text: string;
      timestamp: number;
      isFlagged?: boolean;
    }
  ) {
    let sig = globalState.signaling.get(matchId);
    if (!sig) {
      sig = { candidates: {}, presence: {}, messages: [], reactions: [] };
      globalState.signaling.set(matchId, sig);
    }
    sig.messages.push(message);
    if (sig.messages.length > 100) {
      sig.messages.shift();
    }
    return message;
  },

  addReaction(matchId: string, senderUid: string, emoji: string) {
    let sig = globalState.signaling.get(matchId);
    if (!sig) {
      sig = { candidates: {}, presence: {}, messages: [], reactions: [] };
      globalState.signaling.set(matchId, sig);
    }
    const reaction: ReactionEvent = {
      id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderUid,
      emoji,
      timestamp: Date.now(),
    };
    sig.reactions.push(reaction);
    // Keep max 20 active reactions
    if (sig.reactions.length > 20) {
      sig.reactions.shift();
    }
    return reaction;
  },

  // Connection History
  addHistory(uid: string, record: ConnectionRecord) {
    let list = globalState.history.get(uid);
    if (!list) {
      list = [];
      globalState.history.set(uid, list);
    }
    list.unshift(record);
    if (list.length > 30) {
      list.pop();
    }
  },

  getHistory(uid: string): ConnectionRecord[] {
    return globalState.history.get(uid) || [];
  },

  // Reports
  createReport(report: ReportDoc) {
    globalState.reports.set(report.reportId, report);
    this.addStrike(report.reportedUid, report.reason);
    this.endMatch(report.matchId, "report");
    return report;
  },
};
