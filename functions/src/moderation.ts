import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

const db = admin.firestore();

/**
 * Triggered on new report creation.
 * Evaluates strike limits and applies automated suspensions.
 */
export const onReportCreated = onDocumentCreated("reports/{reportId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const report = snap.data();
  const reportedUid = report.reportedUid;
  const reason = report.reason;

  if (!reportedUid) return;

  const banRef = db.doc(`bans/${reportedUid}`);
  const banDoc = await banRef.get();

  const isUrgent = reason === "nudity" || reason === "minor_concern";

  if (banDoc.exists) {
    const currentStrikes = (banDoc.data()?.strikeCount || 0) + 1;
    const shouldSuspend = isUrgent || currentStrikes >= 3;

    await banRef.update({
      strikeCount: admin.firestore.FieldValue.increment(1),
      isSuspended: shouldSuspend,
      lastReportedAt: Date.now(),
      latestReason: reason,
    });
  } else {
    await banRef.set({
      uid: reportedUid,
      strikeCount: 1,
      isSuspended: isUrgent,
      bannedAt: Date.now(),
      latestReason: reason,
    });
  }

  console.log(`Processed safety report for user ${reportedUid}, strike incremented. Reason: ${reason}`);
});
