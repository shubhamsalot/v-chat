import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";

export async function POST(req: NextRequest) {
  try {
    const { matchId, uid, candidate } = await req.json();
    if (!matchId || !uid || !candidate) {
      return NextResponse.json({ error: "matchId, uid, and candidate are required" }, { status: 400 });
    }

    matchmakingStore.addCandidate(matchId, uid, candidate);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
