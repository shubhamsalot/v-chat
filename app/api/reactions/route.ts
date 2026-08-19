import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";

export async function POST(req: NextRequest) {
  try {
    const { matchId, senderUid, emoji } = await req.json();

    if (!matchId || !senderUid || !emoji) {
      return NextResponse.json(
        { error: "matchId, senderUid, and emoji are required." },
        { status: 400 }
      );
    }

    const reaction = matchmakingStore.addReaction(matchId, senderUid, emoji);
    return NextResponse.json({ success: true, reaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
