"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Users,
  AlertCircle,
  ShieldCheck,
  VideoOff,
  Sparkles,
  WifiOff,
  Home,
  FastForward,
  Globe,
} from "lucide-react";
import { DraggableSelfView } from "@/components/DraggableSelfView";
import { CallControls } from "@/components/CallControls";
import { ChatDrawer } from "@/components/ChatDrawer";
import { ReportModal } from "@/components/ReportModal";
import { ReactionsOverlay } from "@/components/ReactionsOverlay";
import { soundFX } from "@/lib/audio/sounds";
import { COUNTRIES } from "@/lib/data/countries";
import { ChatMessage, Gender, ReactionEvent, ReportReason } from "@/lib/types";

function CallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const initialName = searchParams.get("name") || "Stranger";
  const prefCountry = searchParams.get("country") || "GLOBAL";
  const prefGender = (searchParams.get("gender") as Gender) || "all";

  // Remote Video Ref
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Call States: "searching" | "connecting" | "connected" | "ended" | "error" | "banned"
  const [callState, setCallState] = useState<"searching" | "connecting" | "connected" | "ended" | "error" | "banned">("searching");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchedPeerUid, setMatchedPeerUid] = useState<string | null>(null);
  const [peerDetails, setPeerDetails] = useState<{ displayName: string; avatarUrl?: string; country?: string; gender?: Gender } | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local Media Stream
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // In-Call Chat & Drawer
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Floating Reactions
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);

  // Report Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRequeueing, setIsRequeueing] = useState(false);

  // WebRTC Peer Connection Ref
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const isOffererRef = useRef<boolean>(false);
  const offerSentRef = useRef<boolean>(false);
  const answerSentRef = useRef<boolean>(false);
  const iceServersRef = useRef<RTCIceServer[]>([
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ]);

  const [searchSeconds, setSearchSeconds] = useState(0);

  // 1. Initialize Local Media
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function setupMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: true,
        });
        setLocalStream(stream);
      } catch (err: any) {
        console.error("[Media] Error accessing camera/mic:", err);
        setCallState("error");
        setErrorMessage("Could not access camera or microphone. Please check permissions.");
      }
    }
    setupMedia();

    // Fetch dynamic TURN if available
    fetch("/api/turn")
      .then((res) => res.json())
      .then((data) => {
        if (data.iceServers) {
          iceServersRef.current = data.iceServers;
        }
      })
      .catch((e) => console.warn("[TURN] Fallback to default STUN:", e));

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. Queue Search Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState === "searching") {
      timer = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);
    } else {
      setSearchSeconds(0);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Teardown Peer Connection cleanly
  const teardownPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    offerSentRef.current = false;
    answerSentRef.current = false;
  }, []);

  // 3. Matchmaking Polling Loop
  useEffect(() => {
    if (!uid) {
      router.push("/");
      return;
    }

    if (callState !== "searching") return;

    let pollInterval: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch(`/api/matchmaking/poll?uid=${encodeURIComponent(uid)}`);
        const data = await res.json();

        if (data.status === "matched" && data.matchId) {
          setMatchId(data.matchId);
          setMatchedPeerUid(data.matchedWith || "stranger");
          if (data.peerDetails) {
            setPeerDetails(data.peerDetails);
          }
          setCallState("connecting");
          soundFX.playConnectSound();
        }
      } catch (e) {
        console.warn("[Polling] error:", e);
      }
    };

    poll();
    pollInterval = setInterval(poll, 1000);

    return () => clearInterval(pollInterval);
  }, [uid, callState, router]);

  // 4. WebRTC Connection Setup upon Match
  useEffect(() => {
    if (!matchId || !uid || !matchedPeerUid || !localStream || callState !== "connecting") return;

    teardownPeerConnection();

    const isOfferer = uid < matchedPeerUid;
    isOffererRef.current = isOfferer;

    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
    });
    peerConnectionRef.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallState("connected");
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        fetch("/api/signaling/candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId,
            uid,
            candidate: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            },
          }),
        }).catch((err) => console.warn("[Signaling] candidate send error:", err));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        setCallState((prev) => {
          if (prev === "connected" || prev === "connecting") {
            setEndReason("Stranger disconnected.");
            return "ended";
          }
          return prev;
        });
      }
    };

    if (isOfferer) {
      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (pc.localDescription) {
            offerSentRef.current = true;
            return fetch("/api/signaling/offer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                matchId,
                sdp: pc.localDescription.sdp,
              }),
            });
          }
        })
        .catch((err) => console.error("[WebRTC] Offer error:", err));
    }
  }, [matchId, uid, matchedPeerUid, localStream, callState, teardownPeerConnection]);

  // 5. Signaling Polling Loop
  useEffect(() => {
    if (!matchId || !uid) return;

    let signalingInterval: NodeJS.Timeout;

    const pollSignaling = async () => {
      try {
        const res = await fetch(`/api/signaling/state?matchId=${encodeURIComponent(matchId)}&uid=${encodeURIComponent(uid)}`);
        const data = await res.json();

        if (data.match && data.match.endedAt) {
          teardownPeerConnection();
          setCallState("ended");
          setEndReason(
            data.match.endReason === "report"
              ? "Call ended due to a participant report."
              : data.match.endReason === "next"
              ? "Stranger clicked Next."
              : "Stranger left the conversation."
          );
          return;
        }

        const sig = data.signaling;
        const pc = peerConnectionRef.current;
        if (!sig || !pc) return;

        if (!isOffererRef.current && sig.offer && !answerSentRef.current && pc.signalingState === "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: sig.offer.sdp }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          answerSentRef.current = true;
          await fetch("/api/signaling/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchId,
              sdp: answer.sdp,
            }),
          });
        }

        if (isOffererRef.current && sig.answer && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: sig.answer.sdp }));
        }

        const peerCandidates = matchedPeerUid ? sig.candidates?.[matchedPeerUid] : null;
        if (peerCandidates && Array.isArray(peerCandidates)) {
          for (const cand of peerCandidates) {
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
            } catch (e) {}
          }
        }

        if (sig.messages && Array.isArray(sig.messages)) {
          setMessages((prev) => {
            if (sig.messages.length > prev.length) {
              soundFX.playMessageSound();
              if (!isChatOpen) {
                setUnreadCount((c) => c + (sig.messages.length - prev.length));
              }
            }
            return sig.messages;
          });
        }

        if (sig.reactions && Array.isArray(sig.reactions)) {
          setReactions(sig.reactions);
        }
      } catch (err) {
        console.warn("[Signaling] Poll error:", err);
      }
    };

    signalingInterval = setInterval(pollSignaling, 1000);

    return () => clearInterval(signalingInterval);
  }, [matchId, uid, matchedPeerUid, isChatOpen, teardownPeerConnection]);

  // Actions
  const handleToggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!matchId || !uid) return;
    try {
      await fetch("/api/moderate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          senderUid: uid,
          senderName: initialName,
          text,
        }),
      });
    } catch (e) {
      console.error("[Chat] Send message error:", e);
    }
  };

  const handleSendReaction = async (emoji: string) => {
    if (!matchId || !uid) return;
    try {
      await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          senderUid: uid,
          emoji,
        }),
      });
    } catch (e) {
      console.error("[Reaction] Error:", e);
    }
  };

  // Next Stranger (Re-queue)
  const handleNext = async () => {
    soundFX.playSkipSound();
    setIsRequeueing(true);
    teardownPeerConnection();

    if (matchId) {
      fetch("/api/matchmaking/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, reason: "next" }),
      }).catch(() => {});
    }

    setMatchId(null);
    setMatchedPeerUid(null);
    setPeerDetails(null);
    setMessages([]);
    setReactions([]);
    setEndReason(null);

    const interests = JSON.parse(localStorage.getItem("vchat_interests") || "[]");
    try {
      const res = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          displayName: initialName,
          interests,
          preferredCountry: prefCountry,
          preferredGender: prefGender,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("suspended")) {
          setCallState("banned");
          setErrorMessage(data.error);
        } else {
          setCallState("error");
          setErrorMessage(data.error || "Failed to requeue.");
        }
      } else {
        setCallState("searching");
      }
    } catch (e) {
      setCallState("error");
      setErrorMessage("Network error during matchmaking requeue.");
    } finally {
      setIsRequeueing(false);
    }
  };

  // Stop Call
  const handleStop = async () => {
    soundFX.playSkipSound();
    teardownPeerConnection();
    if (matchId) {
      fetch("/api/matchmaking/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, reason: "stop" }),
      }).catch(() => {});
    }
    fetch("/api/matchmaking/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid }),
    }).catch(() => {});

    router.push("/");
  };

  // Submit Report
  const handleSubmitReport = async (reason: ReportReason) => {
    if (!matchId || !matchedPeerUid) return;

    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterUid: uid,
          reportedUid: matchedPeerUid,
          matchId,
          reason,
        }),
      });
    } catch (e) {
      console.error("[Report] Error:", e);
    }

    setIsReportModalOpen(false);
    teardownPeerConnection();
    setCallState("ended");
    setEndReason("You reported this participant. The call was terminated immediately.");
  };

  const peerCountryObj = peerDetails?.country
    ? COUNTRIES.find((c) => c.code === peerDetails.country)
    : null;

  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden select-none">
      {/* Full-bleed Remote Video Container */}
      <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">
        {/* Remote Live Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            callState === "connected" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Stranger Info Badge in Call */}
        {callState === "connected" && peerDetails && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/85 backdrop-blur-md border border-surface-border shadow-lg">
            <span className="text-base">{peerCountryObj?.flag || "🌐"}</span>
            <span className="text-xs font-bold text-text">
              {peerDetails.displayName}
            </span>
          </div>
        )}

        {/* Searching / Queue State */}
        {callState === "searching" && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10 animate-fadeIn max-w-md">
            <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
              <div className="relative w-12 h-12 rounded-full bg-surface border border-accent flex items-center justify-center text-accent shadow-lg">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text mb-1">
              Looking for a stranger...
            </h2>
            <p className="text-xs text-text-muted mb-2 font-mono">
              Queue time: {searchSeconds}s
            </p>
            <div className="flex items-center gap-2 text-[11px] text-text-dark mb-4">
              <Globe className="w-3.5 h-3.5" />
              <span>Matching with {prefCountry === "GLOBAL" ? "Worldwide" : prefCountry}</span>
            </div>
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded bg-surface border border-surface-border text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            >
              Cancel Search
            </button>
          </div>
        )}

        {/* Connecting State */}
        {callState === "connecting" && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10 animate-fadeIn">
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-3" />
            <h3 className="text-lg font-bold text-text mb-1">Stranger Connected!</h3>
            <p className="text-xs text-text-muted font-mono">
              Establishing encrypted WebRTC video stream...
            </p>
          </div>
        )}

        {/* Ended / Disconnected State */}
        {callState === "ended" && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10 bg-surface/90 backdrop-blur-md border border-surface-border rounded-md max-w-md shadow-2xl animate-fadeIn">
            <div className="w-12 h-12 rounded bg-danger/10 border border-danger/30 flex items-center justify-center text-danger mb-3">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-text mb-1">Call Ended</h3>
            <p className="text-xs text-text-muted mb-6 leading-relaxed">
              {endReason || "Stranger has disconnected from the video call."}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={handleStop}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded border border-surface-border text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                Home
              </button>
              <button
                id="requeue-button"
                onClick={handleNext}
                disabled={isRequeueing}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg"
              >
                {isRequeueing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FastForward className="w-3.5 h-3.5 fill-current" />
                )}
                Find Next
              </button>
            </div>
          </div>
        )}

        {/* Error / Banned State */}
        {(callState === "error" || callState === "banned") && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10 bg-surface/95 border border-danger/40 rounded-md max-w-md shadow-2xl">
            <AlertCircle className="w-12 h-12 text-danger mb-3" />
            <h3 className="text-lg font-bold text-text mb-1">
              {callState === "banned" ? "Account Suspended" : "Connection Error"}
            </h3>
            <p className="text-xs text-text-muted mb-6 leading-relaxed">
              {errorMessage || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2.5 rounded bg-surface border border-surface-border text-xs font-semibold text-text hover:bg-surface-muted transition-colors"
            >
              Return to Landing Page
            </button>
          </div>
        )}
      </div>

      {/* Floating Animated Emojis & Reactions Bar */}
      {callState === "connected" && (
        <ReactionsOverlay
          reactions={reactions}
          onSendReaction={handleSendReaction}
        />
      )}

      {/* Draggable Self View Tile */}
      <DraggableSelfView
        stream={localStream}
        isMuted={isMicMuted}
        isVideoOff={isVideoOff}
        displayName={initialName}
      />

      {/* Floating Control Bar */}
      {callState !== "banned" && callState !== "error" && (
        <CallControls
          isMuted={isMicMuted}
          isVideoOff={isVideoOff}
          isChatOpen={isChatOpen}
          unreadCount={unreadCount}
          isRequeueing={isRequeueing}
          onToggleMic={handleToggleMic}
          onToggleVideo={handleToggleVideo}
          onToggleChat={() => {
            setIsChatOpen(!isChatOpen);
            if (!isChatOpen) setUnreadCount(0);
          }}
          onNext={handleNext}
          onStop={handleStop}
          onOpenReport={() => setIsReportModalOpen(true)}
        />
      )}

      {/* Collapsible Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        messages={messages}
        currentUid={uid}
        onClose={() => setIsChatOpen(false)}
        onSendMessage={handleSendMessage}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleSubmitReport}
      />
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-background flex flex-col items-center justify-center text-text">
          <Loader2 className="w-10 h-10 text-accent animate-spin mb-3" />
          <p className="text-xs font-mono text-text-muted">Loading V-Chat stream...</p>
        </div>
      }
    >
      <CallContent />
    </Suspense>
  );
}
