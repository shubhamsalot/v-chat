import { supabase } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ChatMessage, ReactionEvent } from "@/lib/types";

export interface SignalingCallbacks {
  onOffer: (sdp: string) => void;
  onAnswer: (sdp: string) => void;
  onCandidate: (candidate: RTCIceCandidateInit) => void;
  onChatMessage: (message: ChatMessage) => void;
  onReaction: (reaction: ReactionEvent) => void;
  onPeerLeft: () => void;
}

export class SupabaseSignalingRoom {
  private channel: RealtimeChannel | null = null;
  private matchId: string;
  private uid: string;
  private callbacks: SignalingCallbacks;

  constructor(matchId: string, uid: string, callbacks: SignalingCallbacks) {
    this.matchId = matchId;
    this.uid = uid;
    this.callbacks = callbacks;
  }

  join(): RealtimeChannel {
    const channelName = `match_room_${this.matchId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.uid },
      },
    });

    this.channel
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        if (payload?.sdp) {
          this.callbacks.onOffer(payload.sdp);
        }
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        if (payload?.sdp) {
          this.callbacks.onAnswer(payload.sdp);
        }
      })
      .on("broadcast", { event: "candidate" }, ({ payload }) => {
        if (payload?.candidate) {
          this.callbacks.onCandidate(payload.candidate);
        }
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        if (payload?.message) {
          this.callbacks.onChatMessage(payload.message);
        }
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        if (payload?.reaction) {
          this.callbacks.onReaction(payload.reaction);
        }
      })
      .on("broadcast", { event: "peer_left" }, () => {
        this.callbacks.onPeerLeft();
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const otherLeft = leftPresences.some((p: any) => p.key !== this.uid);
        if (otherLeft) {
          this.callbacks.onPeerLeft();
        }
      });

    this.channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await this.channel?.track({
          uid: this.uid,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    return this.channel;
  }

  sendOffer(sdp: string) {
    this.channel?.send({
      type: "broadcast",
      event: "offer",
      payload: { sdp, senderUid: this.uid },
    });
  }

  sendAnswer(sdp: string) {
    this.channel?.send({
      type: "broadcast",
      event: "answer",
      payload: { sdp, senderUid: this.uid },
    });
  }

  sendCandidate(candidate: RTCIceCandidateInit) {
    this.channel?.send({
      type: "broadcast",
      event: "candidate",
      payload: { candidate, senderUid: this.uid },
    });
  }

  sendChatMessage(message: ChatMessage) {
    this.channel?.send({
      type: "broadcast",
      event: "chat",
      payload: { message },
    });
  }

  sendReaction(reaction: ReactionEvent) {
    this.channel?.send({
      type: "broadcast",
      event: "reaction",
      payload: { reaction },
    });
  }

  leave() {
    if (this.channel) {
      this.channel.send({
        type: "broadcast",
        event: "peer_left",
        payload: { senderUid: this.uid },
      });
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
