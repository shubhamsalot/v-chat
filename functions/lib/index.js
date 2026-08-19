"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purgeExpiredChatMessages = exports.onReportCreated = exports.onMatchmakingQueueCreated = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
var matchmaking_1 = require("./matchmaking");
Object.defineProperty(exports, "onMatchmakingQueueCreated", { enumerable: true, get: function () { return matchmaking_1.onMatchmakingQueueCreated; } });
var moderation_1 = require("./moderation");
Object.defineProperty(exports, "onReportCreated", { enumerable: true, get: function () { return moderation_1.onReportCreated; } });
var cleanup_1 = require("./cleanup");
Object.defineProperty(exports, "purgeExpiredChatMessages", { enumerable: true, get: function () { return cleanup_1.purgeExpiredChatMessages; } });
// TODO: required before public launch: SFU relay frame sampling with Google Cloud Vision SafeSearch
//# sourceMappingURL=index.js.map