"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeExpiredChatMessages = void 0;
const admin = require("firebase-admin");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const db = admin.firestore();
const rtdb = admin.database();
/**
 * Scheduled function running daily to purge ephemeral match messages older than 24 hours.
 */
exports.purgeExpiredChatMessages = (0, scheduler_1.onSchedule)("every 24 hours", async () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    console.log(`Starting 24h ephemeral chat purge for matches completed prior to ${new Date(cutoff).toISOString()}`);
    const expiredMatchesSnap = await db
        .collection("matches")
        .where("endedAt", "<=", cutoff)
        .limit(100)
        .get();
    for (const matchDoc of expiredMatchesSnap.docs) {
        const matchId = matchDoc.id;
        // Hard delete RTDB messages
        try {
            await rtdb.ref(`matches/${matchId}`).remove();
            await rtdb.ref(`signaling/${matchId}`).remove();
        }
        catch (e) {
            console.warn(`Error purging ephemeral data for match ${matchId}:`, e);
        }
    }
    console.log(`Cleaned up ephemeral records for ${expiredMatchesSnap.size} expired matches.`);
});
//# sourceMappingURL=cleanup.js.map