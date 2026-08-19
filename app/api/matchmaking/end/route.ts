import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";
import { MatchEndReason } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { matchId, reason } = await req.json();
    if (!matchId) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    matchmakingStore.endMatch(matchId, (reason as MatchEndReason) || "stop");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
