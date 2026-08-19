import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");
  if (!uid) {
    return NextResponse.json({ error: "Missing UID" }, { status: 400 });
  }

  const history = matchmakingStore.getHistory(uid);
  return NextResponse.json({ history });
}
