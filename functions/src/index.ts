import * as admin from "firebase-admin";

admin.initializeApp();

export { onMatchmakingQueueCreated } from "./matchmaking";
export { onReportCreated } from "./moderation";
export { purgeExpiredChatMessages } from "./cleanup";

// TODO: required before public launch: SFU relay frame sampling with Google Cloud Vision SafeSearch
