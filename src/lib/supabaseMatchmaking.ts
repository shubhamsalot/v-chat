import { supabase, SupabaseUserProfile } from "./supabase";
import { moderateMessageText } from "./moderation";
import { RealtimeChannel } from "@supabase/supabase-js";

export const RTC_ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export interface QueueMatchResult {
  matchId: string;
  peerId: string;
  peerName: string;
}

/**
 * Check if a user is currently banned in Supabase
 */
export async function checkUserBanStatus(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("bans")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data && (data.is_suspended || data.strikes >= 3)) {
      return true;
    }
  } catch {}
  return false;
}

/**
 * Join Supabase Matchmaking Queue
 */
export async function joinSupabaseQueue(
  user: SupabaseUserProfile,
  countryFilter: string = "Worldwide",
  genderFilter: string = "all"
): Promise<QueueMatchResult | null> {
  const isBanned = await checkUserBanStatus(user.id);
  if (isBanned) {
    throw new Error("This account is currently suspended from V-Chat for community guideline violations.");
  }

  // Upsert into matchmaking_queue
  await supabase.from("matchmaking_queue").upsert(
    {
      user_id: user.id,
      username: user.username,
      country: user.country,
      gender: user.gender,
      gender_preference: genderFilter,
      status: "waiting",
      matched_with: null,
      match_id: null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  // Try atomic Postgres pairing
  try {
    const { data, error } = await supabase.rpc("pair_matchmaking_candidate", {
      p_user_id: user.id,
    });

    if (data && data.length > 0 && data[0].match_id) {
      return {
        matchId: data[0].match_id,
        peerId: data[0].matched_user_id,
        peerName: data[0].matched_username || "Stranger",
      };
    }
  } catch (err) {
    console.warn("RPC pairing attempt:", err);
  }

  return null;
}

/**
 * Leave Supabase Matchmaking Queue
 */
export async function leaveSupabaseQueue(userId: string): Promise<void> {
  try {
    await supabase.from("matchmaking_queue").delete().eq("user_id", userId);
  } catch (err) {
    console.warn("Error leaving queue:", err);
  }
}

/**
 * Realtime Listener for Matchmaking Queue pairing
 */
export function subscribeToSupabaseMatch(
  userId: string,
  onMatched: (result: QueueMatchResult) => void
): () => void {
  const channel = supabase
    .channel(`queue_user_${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "matchmaking_queue",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row && row.status === "matched" && row.match_id && row.matched_with) {
          onMatched({
            matchId: row.match_id,
            peerId: row.matched_with,
            peerName: "Stranger",
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Full Realtime WebRTC P2P Signaling via Supabase Broadcast Channel
 */
export function setupSupabaseWebRTC(
  matchId: string,
  localUserId: string,
  peerUserId: string,
  localStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void,
  onPeerDisconnected: () => void
) {
  const peerConnection = new RTCPeerConnection(RTC_ICE_SERVERS);
  const isOfferer = localUserId < peerUserId; // Deterministic offerer

  // Add local stream tracks
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Handle incoming remote media tracks
  const remoteStream = new MediaStream();
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
    onRemoteStream(remoteStream);
  };

  // Setup Supabase Realtime Broadcast Channel
  const signalingChannel: RealtimeChannel = supabase.channel(`signaling_${matchId}`, {
    config: { broadcast: { self: false } },
  });

  // ICE candidates sender
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      signalingChannel.send({
        type: "broadcast",
        event: "ice_candidate",
        payload: {
          senderId: localUserId,
          candidate: event.candidate.toJSON(),
        },
      });
    }
  };

  // Listen to broadcast events
  signalingChannel
    .on("broadcast", { event: "sdp_offer" }, async ({ payload }) => {
      if (payload.senderId !== localUserId && !peerConnection.currentRemoteDescription) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          signalingChannel.send({
            type: "broadcast",
            event: "sdp_answer",
            payload: {
              senderId: localUserId,
              answer: answer,
            },
          });
        } catch (err) {
          console.error("Error answering SDP offer:", err);
        }
      }
    })
    .on("broadcast", { event: "sdp_answer" }, async ({ payload }) => {
      if (payload.senderId !== localUserId && !peerConnection.currentRemoteDescription) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
        } catch (err) {
          console.error("Error setting remote SDP answer:", err);
        }
      }
    })
    .on("broadcast", { event: "ice_candidate" }, async ({ payload }) => {
      if (payload.senderId !== localUserId && payload.candidate) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          // Ignore duplicate ICE candidate errors
        }
      }
    })
    .on("broadcast", { event: "peer_left" }, ({ payload }) => {
      if (payload.senderId !== localUserId) {
        onPeerDisconnected();
      }
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED" && isOfferer) {
        try {
          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await peerConnection.setLocalDescription(offer);

          signalingChannel.send({
            type: "broadcast",
            event: "sdp_offer",
            payload: {
              senderId: localUserId,
              offer: offer,
            },
          });
        } catch (err) {
          console.error("Error creating initial SDP offer:", err);
        }
      }
    });

  return {
    peerConnection,
    disconnect: () => {
      try {
        signalingChannel.send({
          type: "broadcast",
          event: "peer_left",
          payload: { senderId: localUserId },
        });
        supabase.removeChannel(signalingChannel);
        peerConnection.close();
      } catch (err) {}
    },
  };
}

/**
 * Send Ephemeral / Database Chat Message
 */
export async function sendChatMessage(
  matchId: string,
  senderId: string,
  senderName: string,
  text: string
) {
  const { isToxic, sanitizedText } = await moderateMessageText(text);

  await supabase.from("messages").insert({
    match_id: matchId,
    sender_id: senderId,
    sender_name: senderName,
    text: sanitizedText,
    is_flagged: isToxic,
  });

  return { isToxic, text: sanitizedText };
}

/**
 * End match in Supabase
 */
export async function endMatchSupabase(matchId: string, reason: string) {
  try {
    await supabase
      .from("matches")
      .update({
        status: "ended",
        ended_reason: reason,
        ended_at: new Date().toISOString(),
      })
      .eq("id", matchId);
  } catch (err) {}
}

/**
 * Submit safety report to Supabase
 */
export async function submitSupabaseReport(
  reporterId: string,
  reportedId: string,
  matchId: string,
  reason: string,
  evidenceUrl?: string | null
) {
  await supabase.from("reports").insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    match_id: matchId,
    reason,
    evidence_url: evidenceUrl || null,
    status: "pending",
  });

  // Apply ban strike
  const isUrgent = reason === "nudity" || reason === "minor_concern";
  const { data: existingBan } = await supabase
    .from("bans")
    .select("*")
    .eq("user_id", reportedId)
    .single();

  if (existingBan) {
    const newStrikes = (existingBan.strikes || 0) + 1;
    await supabase
      .from("bans")
      .update({
        strikes: newStrikes,
        is_suspended: isUrgent || newStrikes >= 3,
        reason,
      })
      .eq("user_id", reportedId);
  } else {
    await supabase.from("bans").insert({
      user_id: reportedId,
      reason,
      strikes: 1,
      is_suspended: isUrgent,
    });
  }
}
