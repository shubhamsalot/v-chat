import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";

export async function POST(req: NextRequest) {
  try {
    const { uid, displayName, ageConfirmed, isAnonymous } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "Missing UID" }, { status: 400 });
    }

    const profile = matchmakingStore.setUser(uid, {
      displayName: displayName || "Stranger",
      ageConfirmed: Boolean(ageConfirmed),
      isAnonymous: isAnonymous ?? true,
    });

    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get("uid");
  if (!uid) {
    return NextResponse.json({ error: "Missing UID" }, { status: 400 });
  }

  const profile = matchmakingStore.getUser(uid);
  const banStatus = matchmakingStore.isBanned(uid);

  return NextResponse.json({ profile, banStatus });
}
