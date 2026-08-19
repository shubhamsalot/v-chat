import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");
  if (!uid) {
    return NextResponse.json({ error: "UID is required" }, { status: 400 });
  }

  const result = matchmakingStore.pollQueue(uid);
  return NextResponse.json(result);
}
