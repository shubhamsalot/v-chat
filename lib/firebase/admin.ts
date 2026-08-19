import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
    } else {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "v-chat-dev",
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://v-chat-dev-default-rtdb.firebaseio.com",
      });
    }
  } catch (err) {
    console.warn("[Firebase Admin] Initialization warning:", err);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminFirestore = admin.apps.length ? admin.firestore() : null;
export const adminRtdb = admin.apps.length ? admin.database() : null;
export { admin };
