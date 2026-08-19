import { 
  db, 
  rtdb 
} from "./firebase";
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  runTransaction 
} from "firebase/firestore";
import { ref, set, onDisconnect, remove } from "firebase/database";
import { QueueEntry, MatchSession, UserProfile } from "@/types";

/**
 * Join the matchmaking queue.
 * Performs client-side pre-validation and transactional candidate search/pairing if cloud function is running in peer-pairing fallback mode.
 */
export async function joinMatchmakingQueue(
  user: UserProfile,
  interests: string[]
): Promise<() => void> {
  // Verify Age Gate
  if (!user.ageConfirmed) {
    throw new Error("Age confirmation is required before joining the video queue.");
  }

  // Verify Ban Status
  const banRef = doc(db, "bans", user.uid);
  const banSnap = await getDoc(banRef);
  if (banSnap.exists()) {
    const banData = banSnap.data();
    if (banData.isSuspended || banData.strikeCount >= 3) {
      throw new Error("This account is currently suspended from V-Chat for community guideline violations.");
    }
  }

  const queueRef = doc(db, "matchmaking_queue", user.uid);
  const entry: QueueEntry = {
    uid: user.uid,
    displayName: user.displayName,
    interests: interests.map((i) => i.trim().toLowerCase()).filter(Boolean),
    joinedAt: Date.now(),
    status: "waiting",
    region: Intl.DateTimeFormat().resolvedOptions().timeZone || "global",
  };

  await setDoc(queueRef, entry);

  // Attempt client-side transactional pair search in case server functions are in fallback
  tryPairTransactional(user.uid, entry.interests);

  // Return unsubscribe function
  return () => {
    deleteDoc(queueRef).catch(() => {});
  };
}

/**
 * Transactional Matchmaking Engine (runs either in Cloud Function trigger or client fallback)
 */
export async function tryPairTransactional(
  currentUid: string,
  userInterests: string[]
): Promise<string | null> {
  try {
    const queueCollection = collection(db, "matchmaking_queue");
    const q = query(
      queueCollection,
      where("status", "==", "waiting"),
      orderBy("joinedAt", "asc"),
      limit(25)
    );

    const snapshot = await getDocs(q);
    const candidates = snapshot.docs
      .map((d) => ({ ...d.data(), id: d.id } as QueueEntry & { id: string }))
      .filter((c) => c.uid !== currentUid);

    if (candidates.length === 0) {
      return null;
    }

    // Score candidates based on interest overlaps
    const userInterestSet = new Set(userInterests);
    let bestCandidate = candidates[0];
    let maxOverlap = -1;

    for (const cand of candidates) {
      const overlap = cand.interests.filter((i) => userInterestSet.has(i)).length;
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestCandidate = cand;
      }
    }

    const matchId = [currentUid, bestCandidate.uid].sort().join("_") + "_" + Date.now();
    const currentQueueRef = doc(db, "matchmaking_queue", currentUid);
    const candidateQueueRef = doc(db, "matchmaking_queue", bestCandidate.uid);
    const matchRef = doc(db, "matches", matchId);

    await runTransaction(db, async (transaction) => {
      const currentDoc = await transaction.get(currentQueueRef);
      const candDoc = await transaction.get(candidateQueueRef);

      if (!currentDoc.exists() || !candDoc.exists()) {
        throw new Error("One of the participants is no longer in the queue.");
      }

      if (currentDoc.data().status !== "waiting" || candDoc.data().status !== "waiting") {
        throw new Error("Participant already matched.");
      }

      const matchData: MatchSession = {
        id: matchId,
        participants: [currentUid, bestCandidate.uid],
        createdAt: Date.now(),
        endedAt: null,
        endReason: null,
      };

      transaction.set(matchRef, matchData);
      transaction.update(currentQueueRef, { status: "matched", matchedWith: bestCandidate.uid });
      transaction.update(candidateQueueRef, { status: "matched", matchedWith: currentUid });

      // Clean up queue docs
      transaction.delete(currentQueueRef);
      transaction.delete(candidateQueueRef);
    });

    return matchId;
  } catch (err) {
    // Transaction conflict (e.g. peer matched concurrently) - gracefully continue waiting
    return null;
  }
}

/**
 * Listens for active match status for the current user
 */
export function listenForMatch(
  uid: string,
  onMatchFound: (matchId: string, peerUid: string) => void
): () => void {
  const queueRef = doc(db, "matchmaking_queue", uid);

  // Also query matches collection where participants contains uid
  const matchesQuery = query(
    collection(db, "matches"),
    where("participants", "array-contains", uid),
    where("endedAt", "==", null),
    limit(1)
  );

  const unsubMatches = onSnapshot(matchesQuery, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        const data = change.doc.data() as MatchSession;
        if (!data.endedAt) {
          const peerUid = data.participants.find((p) => p !== uid) || "Stranger";
          onMatchFound(change.doc.id, peerUid);
        }
      }
    });
  });

  return () => {
    unsubMatches();
  };
}

/**
 * Ends an active match with a reason
 */
export async function endMatch(
  matchId: string,
  reason: "next" | "stop" | "disconnected" | "reported"
): Promise<void> {
  const matchRef = doc(db, "matches", matchId);
  try {
    await setDoc(matchRef, { endedAt: Date.now(), endReason: reason }, { merge: true });
    // Clean up RTDB ephemeral signaling data
    const signalingRef = ref(rtdb, `signaling/${matchId}`);
    await remove(signalingRef);
  } catch (e) {
    console.error("Error ending match:", e);
  }
}
