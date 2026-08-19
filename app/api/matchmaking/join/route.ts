import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";

export async function POST(req: NextRequest) {
  try {
    const {
      uid,
      displayName,
      interests,
      country,
      gender,
      preferredCountry,
      preferredGender,
    } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    const result = matchmakingStore.joinQueue({
      uid,
      displayName: displayName || "Stranger",
      interests: Array.isArray(interests) ? interests : [],
      country,
      gender,
      preferredCountry,
      preferredGender,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
