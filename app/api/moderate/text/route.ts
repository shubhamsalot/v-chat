import { NextRequest, NextResponse } from "next/server";
import { analyzeTextToxicity } from "@/lib/moderation/perspective";
import { matchmakingStore } from "@/lib/matchmaking/store";
import { ChatMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { matchId, senderUid, senderName, text } = await req.json();

    if (!matchId || !senderUid || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const modResult = await analyzeTextToxicity(text);

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderUid,
      senderName: senderName || "Stranger",
      text: modResult.filteredText,
      timestamp: Date.now(),
      isFlagged: modResult.flagged,
    };

    matchmakingStore.addMessage(matchId, message);

    return NextResponse.json({
      message,
      moderated: modResult.flagged,
      reason: modResult.reason,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
