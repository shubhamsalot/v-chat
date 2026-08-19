import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";

export async function POST(req: NextRequest) {
  try {
    const { matchId, sdp } = await req.json();
    if (!matchId || !sdp) {
      return NextResponse.json({ error: "matchId and sdp are required" }, { status: 400 });
    }

    matchmakingStore.setAnswer(matchId, sdp);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
