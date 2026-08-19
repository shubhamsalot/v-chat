import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  const uid = req.nextUrl.searchParams.get("uid");

  if (!matchId) {
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });
  }

  if (uid) {
    matchmakingStore.updatePresence(matchId, uid, true);
  }

  const signaling = matchmakingStore.getSignaling(matchId);
  const match = matchmakingStore.getMatch(matchId);

  return NextResponse.json({
    signaling: signaling || null,
    match: match || null,
  });
}
