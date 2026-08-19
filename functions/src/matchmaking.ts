import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

const db = admin.firestore();

/**
 * Triggered whenever a user joins the matchmaking queue.
 * Performs server-side ban check, age confirmation validation, and transactional pairing.
 */
export const onMatchmakingQueueCreated = onDocumentCreated(
  "matchmaking_queue/{uid}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const joiningUser = snap.data();
    const uid = event.params.uid;
    const queueRef = snap.ref;

    // 1. Check bans for the joining user
    const banDoc = await db.doc(`bans/${uid}`).get();
    if (banDoc.exists) {
      const banData = banDoc.data();
      if (banData?.isSuspended || (banData?.strikeCount && banData.strikeCount >= 3)) {
        console.warn(`Banned user ${uid} attempted to join queue. Deleting entry.`);
        await queueRef.delete();
        return;
      }
    }

    // 2. Reject if ageConfirmed !== true
    const userDoc = await db.doc(`users/${uid}`).get();
    if (!userDoc.exists || userDoc.data()?.ageConfirmed !== true) {
      console.warn(`Unverified age user ${uid} attempted to join queue. Deleting entry.`);
      await queueRef.delete();
      return;
    }

    // 3. Query up to 25 other waiting candidates
    const candidatesSnap = await db
      .collection("matchmaking_queue")
      .where("status", "==", "waiting")
      .orderBy("joinedAt", "asc")
      .limit(25)
      .get();

    const candidates = candidatesSnap.docs
      .filter((doc) => doc.id !== uid)
      .map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() as any }));

    if (candidates.length === 0) {
      return; // No suitable candidates waiting yet
    }

    // 4. Prefer overlapping interests, fallback to earliest joined
    const userInterests: string[] = joiningUser.interests || [];
    const interestSet = new Set(userInterests);

    let chosenCandidate = candidates[0];
    let maxOverlap = -1;

    for (const cand of candidates) {
      const candInterests: string[] = cand.interests || [];
      const overlap = candInterests.filter((i) => interestSet.has(i)).length;
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        chosenCandidate = cand;
      }
    }

    const matchId = [uid, chosenCandidate.id].sort().join("_") + "_" + Date.now();
    const matchRef = db.doc(`matches/${matchId}`);
    const joiningDocRef = db.doc(`matchmaking_queue/${uid}`);
    const chosenDocRef = db.doc(`matchmaking_queue/${chosenCandidate.id}`);

    // 5. Transactional double-write to prevent race condition double-matching
    try {
      await db.runTransaction(async (transaction) => {
        const freshJoining = await transaction.get(joiningDocRef);
        const freshCandidate = await transaction.get(chosenDocRef);

        if (!freshJoining.exists || !freshCandidate.exists) {
          throw new Error("One or both queue entries are no longer available.");
        }

        if (
          freshJoining.data()?.status !== "waiting" ||
          freshCandidate.data()?.status !== "waiting"
        ) {
          throw new Error("One or both users have already been matched.");
        }

        const matchPayload = {
          id: matchId,
          participants: [uid, chosenCandidate.id],
          createdAt: Date.now(),
          endedAt: null,
          endReason: null,
        };

        transaction.set(matchRef, matchPayload);
        transaction.update(joiningDocRef, { status: "matched", matchedWith: chosenCandidate.id });
        transaction.update(chosenDocRef, { status: "matched", matchedWith: uid });
        transaction.delete(joiningDocRef);
        transaction.delete(chosenDocRef);
      });

      console.log(`Successfully created transactional match ${matchId} for [${uid}, ${chosenCandidate.id}]`);
    } catch (err: any) {
      console.warn("Transactional pairing conflict or aborted:", err.message);
    }
  }
);
