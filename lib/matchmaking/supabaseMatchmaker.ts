import { supabase } from "@/lib/supabase/client";
import { Gender } from "@/lib/types";

export interface MatchResult {
  status: "waiting" | "matched";
  matchId?: string;
  matchedWith?: string;
  peerDetails?: {
    displayName: string;
    avatarUrl?: string;
    country?: string;
    gender?: Gender;
  };
}

export async function joinSupabaseQueue(params: {
  uid: string;
  displayName: string;
  interests: string[];
  country?: string;
  gender?: Gender;
  preferredCountry?: string;
  preferredGender?: Gender;
}): Promise<MatchResult> {
  const { uid, displayName, interests, country, gender, preferredCountry, preferredGender } = params;

  try {
    // 1. Clean up stale entries (> 45s)
    const cutoff = new Date(Date.now() - 45000).toISOString();
    await supabase
      .from("matchmaking_queue")
      .delete()
      .lt("created_at", cutoff);

    // 2. Remove any previous entry for this user
    await supabase
      .from("matchmaking_queue")
      .delete()
      .eq("user_id", uid);

    // 3. Search for a waiting candidate
    let query = supabase
      .from("matchmaking_queue")
      .select("*")
      .eq("status", "waiting")
      .neq("user_id", uid)
      .order("created_at", { ascending: true })
      .limit(10);

    const { data: candidates, error: queryError } = await query;

    if (!queryError && candidates && candidates.length > 0) {
      // Pick best matching candidate (filter by country if preferred)
      let bestCandidate = candidates[0];
      if (preferredCountry && preferredCountry !== "GLOBAL") {
        const countryMatch = candidates.find(
          (c) => c.country === preferredCountry || c.country === "GLOBAL"
        );
        if (countryMatch) bestCandidate = countryMatch;
      }

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Create match in matches table
      await supabase.from("matches").insert({
        id: matchId,
        participant_1: uid,
        participant_2: bestCandidate.user_id,
        status: "active",
      });

      // Update candidate to matched
      await supabase
        .from("matchmaking_queue")
        .update({
          status: "matched",
          matched_with: uid,
          match_id: matchId,
        })
        .eq("user_id", bestCandidate.user_id);

      return {
        status: "matched",
        matchId,
        matchedWith: bestCandidate.user_id,
        peerDetails: {
          displayName: bestCandidate.username || "Stranger",
          country: bestCandidate.country || "GLOBAL",
          gender: (bestCandidate.gender as Gender) || "all",
        },
      };
    }

    // 4. No candidate found -> Insert self into queue
    await supabase.from("matchmaking_queue").insert({
      user_id: uid,
      username: displayName || "Stranger",
      country: country || "GLOBAL",
      gender: gender || "all",
      gender_preference: preferredGender || "all",
      interests: interests || [],
      status: "waiting",
    });

    return { status: "waiting" };
  } catch (err) {
    console.error("[Matchmaker] Error joining queue:", err);
    return { status: "waiting" };
  }
}

export function subscribeToMatchmaking(
  uid: string,
  onMatched: (matchId: string, matchedWith: string) => void
) {
  // 1. Realtime subscription to database changes for instant pairing
  const channel = supabase
    .channel(`queue_listen_${uid}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "matchmaking_queue",
        filter: `user_id=eq.${uid}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row && row.status === "matched" && row.match_id) {
          onMatched(row.match_id, row.matched_with || "stranger");
        }
      }
    )
    .subscribe();

  // 2. Fallback polling every 1.5s in case realtime connection is delayed
  const pollInterval = setInterval(async () => {
    try {
      const { data } = await supabase
        .from("matchmaking_queue")
        .select("*")
        .eq("user_id", uid)
        .single();

      if (data && data.status === "matched" && data.match_id) {
        onMatched(data.match_id, data.matched_with || "stranger");
      }
    } catch (e) {}
  }, 1500);

  return () => {
    clearInterval(pollInterval);
    supabase.removeChannel(channel);
  };
}

export async function leaveSupabaseQueue(uid: string) {
  try {
    await supabase.from("matchmaking_queue").delete().eq("user_id", uid);
  } catch (e) {}
}

export async function endSupabaseMatch(matchId: string, reason: string) {
  try {
    await supabase
      .from("matches")
      .update({
        status: "ended",
        ended_reason: reason,
        ended_at: new Date().toISOString(),
      })
      .eq("id", matchId);
  } catch (e) {}
}
