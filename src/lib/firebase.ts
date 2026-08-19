import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  User,
  connectAuthEmulator 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  connectFirestoreEmulator 
} from "firebase/firestore";
import { 
  getDatabase, 
  connectDatabaseEmulator 
} from "firebase/database";
import { UserProfile } from "@/types";

// Firebase config (can be populated via environment variables or default mock project for local dev)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyApiKeyForLocalEmulator12345",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "v-chat-prod.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://v-chat-prod-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "v-chat-prod",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "v-chat-prod.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Connect to local emulators if running locally and explicitly enabled
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
  try {
    const host = window.location.hostname || "localhost";
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectDatabaseEmulator(rtdb, host, 9000);
  } catch (err) {
    console.warn("Emulators already connected or connection skipped:", err);
  }
}

/**
 * Ensures user doc exists in Firestore upon authentication
 */
export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data() as UserProfile;
  }

  const newProfile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || `Stranger-${user.uid.slice(0, 4).toUpperCase()}`,
    createdAt: Date.now(),
    ageConfirmed: false,
    isAnonymous: user.isAnonymous,
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

/**
 * Confirms user age (18+)
 */
export async function confirmUserAge(uid: string): Promise<void> {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { ageConfirmed: true });
}

export { app, auth, db, rtdb, signInAnonymously, GoogleAuthProvider, signInWithPopup, onAuthStateChanged };
