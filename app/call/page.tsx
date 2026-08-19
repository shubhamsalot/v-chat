"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Users,
  AlertCircle,
  VideoOff,
  WifiOff,
  Home,
  FastForward,
  Globe,
  Mic,
  MicOff,
  Video as VideoIcon,
  MessageSquare,
  Flag,
  Square,
  Sparkles,
} from "lucide-react";
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

  // Video Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
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
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
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

  // Sync local stream with local video element if it mounts later
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
    <div className="w-screen h-screen bg-[#090A0F] text-slate-100 flex flex-col p-2 sm:p-4 relative select-none overflow-hidden">
      {/* 50/50 OMETV DUAL VIDEO SPLIT SCREEN */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 h-full max-h-[calc(100vh-80px)]">
        {/* LEFT PANEL: YOUR CAMERA (50% EQUAL SIZE) */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
          {!isVideoOff && localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <VideoOff className="w-12 h-12 mb-2 text-slate-600" />
              <span className="text-xs font-semibold">Your Camera is Off</span>
            </div>
          )}

          {/* Top Label Badge */}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs font-bold text-white z-10 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{initialName} (You)</span>
          </div>

          {/* Quick Audio/Video Status */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {isMicMuted ? (
              <span className="p-1.5 rounded-lg bg-rose-500/80 text-white backdrop-blur-md">
                <MicOff className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="p-1.5 rounded-lg bg-black/50 text-emerald-400 backdrop-blur-md border border-white/10">
                <Mic className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: STRANGER'S CAMERA (50% EQUAL SIZE) */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
          {/* Live Connected Remote Stream */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              callState === "connected" ? "opacity-100" : "opacity-0 pointer-events-none absolute"
            }`}
          />

          {/* Stranger Info Badge when connected */}
          {callState === "connected" && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center gap-2 text-xs font-bold text-white z-10 shadow-md">
              <span className="text-sm">{peerCountryObj?.flag || "🌐"}</span>
              <span>{peerDetails?.displayName || "Stranger"}</span>
            </div>
          )}

          {/* Searching Queue Screen */}
          {callState === "searching" && (
            <div className="flex flex-col items-center justify-center p-6 text-center animate-fadeIn max-w-sm">
              <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                <div className="relative w-12 h-12 rounded-full bg-slate-900 border border-rose-500/50 flex items-center justify-center text-rose-500 shadow-xl">
                  <Users className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-extrabold text-white mb-1">
                Searching for Stranger...
              </h3>
              <p className="text-xs font-mono text-slate-400 mb-3">
                {searchSeconds}s elapsed
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-[11px] text-slate-400">
                <Globe className="w-3 h-3 text-rose-400" />
                <span>Filter: {prefCountry === "GLOBAL" ? "Worldwide" : prefCountry}</span>
              </div>
            </div>
          )}

          {/* Connecting State */}
          {callState === "connecting" && (
            <div className="flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
              <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Stranger Connected!</h3>
              <p className="text-xs text-slate-400 font-mono">
                Streaming video feed...
              </p>
            </div>
          )}

          {/* Call Ended State */}
          {callState === "ended" && (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl max-w-sm m-4 shadow-2xl animate-fadeIn">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-3">
                <WifiOff className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Call Ended</h4>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                {endReason || "Stranger has disconnected from the call."}
              </p>
              <div className="flex gap-2.5 w-full">
                <button
                  onClick={handleStop}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={handleNext}
                  disabled={isRequeueing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg"
                >
                  <FastForward className="w-3.5 h-3.5 fill-white" />
                  Find Next
                </button>
              </div>
            </div>
          )}

          {/* Error / Banned State */}
          {(callState === "error" || callState === "banned") && (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 border border-rose-500/40 rounded-2xl max-w-sm m-4 shadow-2xl">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">
                {callState === "banned" ? "Account Suspended" : "Camera Error"}
              </h4>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                {errorMessage || "An unexpected error occurred."}
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-5 py-2 rounded-xl bg-slate-800 border border-white/10 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                Return to Home
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Animated Emojis & Reactions Overlay */}
      {callState === "connected" && (
        <ReactionsOverlay
          reactions={reactions}
          onSendReaction={handleSendReaction}
        />
      )}

      {/* CLEAN BOTTOM CONTROL BAR */}
      <div className="h-16 flex items-center justify-center gap-2 sm:gap-4 mt-2">
        <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl">
          {/* Stop / Leave Button */}
          <button
            id="stop-call-button"
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 hover:border-rose-500 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Stop</span>
          </button>

          {/* BIG NEXT BUTTON (PRIMARY) */}
          <button
            id="next-stranger-button"
            onClick={handleNext}
            disabled={isRequeueing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-500/25 active:scale-95 disabled:opacity-50"
          >
            {isRequeueing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FastForward className="w-4 h-4 fill-white" />
            )}
            <span>NEXT</span>
          </button>

          <div className="w-[1px] h-6 bg-white/10 mx-1" />

          {/* Mic Toggle */}
          <button
            id="toggle-mic-button"
            onClick={handleToggleMic}
            title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
            className={`p-2 rounded-xl border transition-colors ${
              isMicMuted
                ? "bg-rose-500/20 border-rose-500 text-rose-400"
                : "bg-slate-800 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Video Toggle */}
          <button
            id="toggle-video-button"
            onClick={handleToggleVideo}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
            className={`p-2 rounded-xl border transition-colors ${
              isVideoOff
                ? "bg-rose-500/20 border-rose-500 text-rose-400"
                : "bg-slate-800 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
          </button>

          {/* Chat Drawer Toggle */}
          <button
            id="toggle-chat-button"
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (!isChatOpen) setUnreadCount(0);
            }}
            title="Toggle Text Chat"
            className={`relative p-2 rounded-xl border transition-colors ${
              isChatOpen
                ? "bg-rose-500/20 border-rose-500 text-rose-400"
                : "bg-slate-800 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Report Button */}
          <button
            id="open-report-button"
            onClick={() => setIsReportModalOpen(true)}
            title="Report User"
            className="p-2 rounded-xl border border-transparent hover:border-white/10 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

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
        <div className="w-screen h-screen bg-[#090A0F] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-3" />
          <p className="text-xs font-mono text-slate-400">Loading V-Chat stream...</p>
        </div>
      }
    >
      <CallContent />
    </Suspense>
  );
}
