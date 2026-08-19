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
  Shield,
} from "lucide-react";
import { ChatDrawer } from "@/components/ChatDrawer";
import { ReportModal } from "@/components/ReportModal";
import { ReactionsOverlay } from "@/components/ReactionsOverlay";
import { soundFX } from "@/lib/audio/sounds";
import { COUNTRIES } from "@/lib/data/countries";
import { ChatMessage, Gender, ReactionEvent, ReportReason } from "@/lib/types";
import { SupabaseSignalingRoom } from "@/lib/webrtc/supabaseSignaling";
import {
  joinSupabaseQueue,
  subscribeToMatchmaking,
  leaveSupabaseQueue,
  endSupabaseMatch,
} from "@/lib/matchmaking/supabaseMatchmaker";
import { analyzeTextToxicity } from "@/lib/moderation/perspective";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
  { urls: ["stun:stun3.l.google.com:19302", "stun:stun4.l.google.com:19302"] },
  { urls: ["stun:global.stun.twilio.com:3478"] },
];

function CallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const initialName = searchParams.get("name") || "Stranger";
  const prefCountry = searchParams.get("country") || "GLOBAL";
  const prefGender = (searchParams.get("gender") as Gender) || "all";

  // Video Elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Call States: "searching" | "connecting" | "connected" | "ended" | "error" | "banned"
  const [callState, setCallState] = useState<
    "searching" | "connecting" | "connected" | "ended" | "error" | "banned"
  >("searching");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchedPeerUid, setMatchedPeerUid] = useState<string | null>(null);
  const [peerDetails, setPeerDetails] = useState<{
    displayName: string;
    avatarUrl?: string;
    country?: string;
    gender?: Gender;
  } | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Local Media
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
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

  // WebRTC & Realtime Signaling Room Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRoomRef = useRef<SupabaseSignalingRoom | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const isOffererRef = useRef<boolean>(false);

  const [searchSeconds, setSearchSeconds] = useState(0);

  // 1. Initialize Local Media Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function setupMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("[Media] Error accessing camera/mic:", err);
        setCallState("error");
        setErrorMessage("Camera or microphone permission was denied. Please allow access.");
      }
    }
    setupMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // 2. Search Timer
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

  // Teardown Peer Connection & Room Cleanly
  const cleanupCall = useCallback(() => {
    if (signalingRoomRef.current) {
      signalingRoomRef.current.leave();
      signalingRoomRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    iceCandidateQueueRef.current = [];
  }, []);

  // 3. Initiate Real-time Matchmaking
  useEffect(() => {
    if (!uid) {
      router.push("/");
      return;
    }

    if (callState !== "searching") return;

    let isMounted = true;
    const interests = JSON.parse(localStorage.getItem("vchat_interests") || "[]");

    // Join matchmaking queue
    joinSupabaseQueue({
      uid,
      displayName: initialName,
      interests,
      preferredCountry: prefCountry,
      preferredGender: prefGender,
    }).then((result) => {
      if (!isMounted) return;
      if (result.status === "matched" && result.matchId) {
        setMatchId(result.matchId);
        setMatchedPeerUid(result.matchedWith || "stranger");
        if (result.peerDetails) {
          setPeerDetails(result.peerDetails);
        }
        setCallState("connecting");
        soundFX.playConnectSound();
      }
    });

    // Subscribe to matchmaking queue changes
    const unsubscribe = subscribeToMatchmaking(uid, (matchedMatchId, peerUid) => {
      if (!isMounted) return;
      setMatchId(matchedMatchId);
      setMatchedPeerUid(peerUid);
      setCallState("connecting");
      soundFX.playConnectSound();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [uid, callState, initialName, prefCountry, prefGender, router]);

  // 4. WebRTC Connection Setup via Supabase Realtime Channel
  useEffect(() => {
    if (!matchId || !uid || !matchedPeerUid || !localStream || callState !== "connecting") return;

    cleanupCall();

    const isOfferer = uid < matchedPeerUid;
    isOffererRef.current = isOfferer;

    // Create RTCPeerConnection with STUN pool
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle remote track
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallState("connected");
      }
    };

    // Connection state monitor
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

    // Join Supabase Realtime Room for instantaneous signaling
    const room = new SupabaseSignalingRoom(matchId, uid, {
      onOffer: async (sdp) => {
        if (!isOffererRef.current && pc.signalingState !== "closed") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));

            // Drain queued ICE candidates
            while (iceCandidateQueueRef.current.length > 0) {
              const candidate = iceCandidateQueueRef.current.shift();
              if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              }
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            room.sendAnswer(answer.sdp!);
          } catch (err) {
            console.error("[WebRTC] Error handling offer:", err);
          }
        }
      },

      onAnswer: async (sdp) => {
        if (isOffererRef.current && pc.signalingState === "have-local-offer") {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));

            // Drain queued ICE candidates
            while (iceCandidateQueueRef.current.length > 0) {
              const candidate = iceCandidateQueueRef.current.shift();
              if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
              }
            }
          } catch (err) {
            console.error("[WebRTC] Error handling answer:", err);
          }
        }
      },

      onCandidate: async (candidate) => {
        try {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
          } else {
            iceCandidateQueueRef.current.push(candidate);
          }
        } catch (err) {
          console.warn("[WebRTC] Error adding ICE candidate:", err);
        }
      },

      onChatMessage: (message) => {
        soundFX.playMessageSound();
        setMessages((prev) => [...prev, message]);
        if (!isChatOpen) {
          setUnreadCount((c) => c + 1);
        }
      },

      onReaction: (reaction) => {
        setReactions((prev) => [...prev, reaction]);
      },

      onPeerLeft: () => {
        cleanupCall();
        setCallState("ended");
        setEndReason("Stranger has disconnected from the video call.");
      },
    });

    signalingRoomRef.current = room;
    room.join();

    // Send ICE candidates via Realtime Broadcast
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        room.sendCandidate(event.candidate.toJSON());
      }
    };

    // If offerer, create offer and broadcast
    if (isOfferer) {
      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (pc.localDescription) {
            room.sendOffer(pc.localDescription.sdp);
          }
        })
        .catch((err) => console.error("[WebRTC] Offer creation error:", err));
    }

    return () => {
      cleanupCall();
    };
  }, [matchId, uid, matchedPeerUid, localStream, callState, cleanupCall, isChatOpen]);

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
    if (!matchId || !uid || !text.trim()) return;

    // Toxicity check
    const mod = await analyzeTextToxicity(text);
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderUid: uid,
      senderName: initialName,
      text: mod.filteredText,
      timestamp: Date.now(),
      isFlagged: mod.flagged,
    };

    // Append to local state
    setMessages((prev) => [...prev, message]);

    // Broadcast instantly to peer over Supabase Realtime
    if (signalingRoomRef.current) {
      signalingRoomRef.current.sendChatMessage(message);
    }
  };

  const handleSendReaction = (emoji: string) => {
    if (!matchId || !uid) return;
    const reaction: ReactionEvent = {
      id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderUid: uid,
      emoji,
      timestamp: Date.now(),
    };

    setReactions((prev) => [...prev, reaction]);

    if (signalingRoomRef.current) {
      signalingRoomRef.current.sendReaction(reaction);
    }
  };

  // Next Stranger (Instant Requeue)
  const handleNext = async () => {
    soundFX.playSkipSound();
    setIsRequeueing(true);
    cleanupCall();

    if (matchId) {
      endSupabaseMatch(matchId, "next").catch(() => {});
    }

    setMatchId(null);
    setMatchedPeerUid(null);
    setPeerDetails(null);
    setMessages([]);
    setReactions([]);
    setEndReason(null);
    setCallState("searching");
    setIsRequeueing(false);
  };

  // Stop Call
  const handleStop = async () => {
    soundFX.playSkipSound();
    cleanupCall();
    if (matchId) {
      endSupabaseMatch(matchId, "stop").catch(() => {});
    }
    leaveSupabaseQueue(uid).catch(() => {});
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
    cleanupCall();
    setCallState("ended");
    setEndReason("You reported this participant. The call was terminated immediately.");
  };

  const peerCountryObj = peerDetails?.country
    ? COUNTRIES.find((c) => c.code === peerDetails.country)
    : null;

  return (
    <div className="w-screen h-screen bg-[#090A0F] text-slate-100 flex flex-col p-2 sm:p-4 relative select-none overflow-hidden">
      {/* 50/50 OMETV EQUAL DUAL CAMERA PANELS */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 h-full max-h-[calc(100vh-80px)]">
        {/* LEFT PANEL: YOUR LIVE CAMERA (50% EQUAL SIZE) */}
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
              <span className="text-xs font-semibold">Your Camera is Paused</span>
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

        {/* RIGHT PANEL: STRANGER'S LIVE CAMERA (50% EQUAL SIZE) */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
          {/* Remote Connected Live Video */}
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
                Looking for a stranger...
              </h3>
              <p className="text-xs font-mono text-slate-400 mb-3">
                {searchSeconds}s elapsed
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-[11px] text-slate-400">
                <Globe className="w-3 h-3 text-rose-400" />
                <span>Target: {prefCountry === "GLOBAL" ? "Worldwide" : prefCountry}</span>
              </div>
            </div>
          )}

          {/* Connecting State */}
          {callState === "connecting" && (
            <div className="flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
              <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Stranger Connected!</h3>
              <p className="text-xs text-slate-400 font-mono">
                Establishing P2P WebRTC video stream...
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

          {/* Error State */}
          {(callState === "error" || callState === "banned") && (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 border border-rose-500/40 rounded-2xl max-w-sm m-4 shadow-2xl">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">
                {callState === "banned" ? "Account Suspended" : "Camera Access Error"}
              </h4>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                {errorMessage || "Could not start video chat."}
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
          {/* Stop Button */}
          <button
            id="stop-call-button"
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 hover:border-rose-500 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 text-xs font-bold uppercase tracking-wider transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Stop</span>
          </button>

          {/* BIG NEXT BUTTON */}
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
