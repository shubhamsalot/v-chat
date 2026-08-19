"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DraggableSelfView } from "@/components/DraggableSelfView";
import { ControlBar } from "@/components/ControlBar";
import { ChatDrawer } from "@/components/ChatDrawer";
import { ReportModal } from "@/components/ReportModal";
import { setupWebRTCSignaling } from "@/lib/webrtc";
import { endMatch, joinMatchmakingQueue, listenForMatch } from "@/lib/matchmaking";
import { submitSafetyReport } from "@/lib/moderation";
import { UserProfile, ReportReason } from "@/types";
import { 
  UserX, 
  Loader2, 
  RotateCw, 
  Home, 
  ShieldAlert, 
  WifiOff, 
  Video 
} from "lucide-react";

function CallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [matchId, setMatchId] = useState<string>(searchParams.get("matchId") || "");
  const [peerUid, setPeerUid] = useState<string>(searchParams.get("peerUid") || "Stranger");
  const [localUid, setLocalUid] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("You");

  // Media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // States
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const [isPeerDisconnected, setIsPeerDisconnected] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number>(5);

  const cleanupRef = useRef<(() => void) | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Read session storage credentials
  useEffect(() => {
    const storedMatchId = searchParams.get("matchId") || sessionStorage.getItem("vchat_matchId") || "";
    const storedPeerUid = searchParams.get("peerUid") || sessionStorage.getItem("vchat_peerUid") || "peer-" + Math.random().toString(36).substring(2, 8);
    const storedLocalUid = sessionStorage.getItem("vchat_localUid") || "user-" + Math.random().toString(36).substring(2, 8);
    const storedName = sessionStorage.getItem("vchat_nickname") || "You";

    setMatchId(storedMatchId);
    setPeerUid(storedPeerUid);
    setLocalUid(storedLocalUid);
    setDisplayName(storedName);

    if (!storedMatchId) {
      // If no match was passed, return to landing
      router.replace("/");
    }
  }, [searchParams, router]);

  // Acquire local media & establish WebRTC signaling
  useEffect(() => {
    if (!matchId || !localUid || !peerUid) return;

    let isMounted = true;

    async function initMediaAndSignaling() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);

        // Setup WebRTC signaling
        const signalingInstance = setupWebRTCSignaling(
          matchId,
          localUid,
          peerUid,
          stream,
          (remote) => {
            if (isMounted) {
              setRemoteStream(remote);
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remote;
              }
              setIsConnecting(false);
            }
          },
          () => {
            // Peer disconnected handler
            if (isMounted) {
              handlePeerDropped();
            }
          }
        );

        cleanupRef.current = signalingInstance.cleanup;
      } catch (err) {
        console.error("Call setup error:", err);
        setIsConnecting(false);
      }
    }

    initMediaAndSignaling();

    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [matchId, localUid, peerUid]);

  const handlePeerDropped = () => {
    setIsPeerDisconnected(true);
    let count = 5;
    setReconnectCountdown(count);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setReconnectCountdown(count);
      if (count <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        handleNext();
      }
    }, 1000);
  };

  const handleToggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!isVideoMuted);
    }
  };

  const handleStop = async () => {
    if (cleanupRef.current) cleanupRef.current();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    await endMatch(matchId, "stop");
    router.push("/");
  };

  const handleNext = async () => {
    if (cleanupRef.current) cleanupRef.current();
    setIsConnecting(true);
    setIsPeerDisconnected(false);
    setRemoteStream(null);

    await endMatch(matchId, "next");

    // Read stored interests and re-join matchmaking
    const rawInterests = sessionStorage.getItem("vchat_interests");
    const interests = rawInterests ? JSON.parse(rawInterests) : [];

    const mockProfile: UserProfile = {
      uid: localUid,
      displayName,
      createdAt: Date.now(),
      ageConfirmed: true,
      isAnonymous: false,
    };

    try {
      await joinMatchmakingQueue(mockProfile, interests);
      const unsub = listenForMatch(localUid, (newMatchId, newPeerUid) => {
        unsub();
        setMatchId(newMatchId);
        setPeerUid(newPeerUid);
        sessionStorage.setItem("vchat_matchId", newMatchId);
        sessionStorage.setItem("vchat_peerUid", newPeerUid);
        setIsConnecting(false);
      });
    } catch (e) {
      console.error("Re-queue error:", e);
      router.push("/");
    }
  };

  const handleSubmitReport = async (reason: ReportReason, captureFrame: boolean) => {
    try {
      let frameUrl: string | null = null;
      if (captureFrame && remoteVideoRef.current) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = remoteVideoRef.current.videoWidth || 640;
          canvas.height = remoteVideoRef.current.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(remoteVideoRef.current, 0, 0, canvas.width, canvas.height);
            frameUrl = canvas.toDataURL("image/jpeg", 0.6);
          }
        } catch {}
      }

      await submitSafetyReport({
        reporterUid: localUid,
        reportedUid: peerUid,
        matchId,
        reason,
        evidenceFrameUrl: frameUrl,
      });

      // Disconnect reporter immediately
      if (cleanupRef.current) cleanupRef.current();
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      await endMatch(matchId, "reported");
      router.push("/?reported=true");
    } catch (e) {
      console.error("Error submitting report:", e);
      router.push("/");
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#0D0D0F] overflow-hidden select-none">
      {/* Full-bleed Remote Video */}
      <div className="relative w-full h-full flex items-center justify-center bg-[#0D0D0F]">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            remoteStream && !isPeerDisconnected ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Loading / Connecting Overlay */}
        {isConnecting && !isPeerDisconnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0D0D0F] z-10 space-y-4">
            <div className="w-12 h-12 border-4 border-[#FF4B2B] border-t-transparent rounded-full animate-spin" />
            <div className="text-center">
              <h2 className="text-lg font-bold text-[#F2F2F0] font-display">
                Connecting with Stranger...
              </h2>
              <p className="text-xs text-[#80808A] mt-1 font-mono">
                P2P ICE Negotiation & Signaling in progress
              </p>
            </div>
          </div>
        )}

        {/* Peer Disconnected Overlay */}
        {isPeerDisconnected && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 space-y-5 p-6 text-center animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-[6px] bg-red-950/40 border border-red-800/50 flex items-center justify-center text-red-400">
              <UserX className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h2 className="text-xl font-bold text-[#F2F2F0]">Stranger Disconnected</h2>
              <p className="text-xs text-[#90909A] mt-1.5 leading-relaxed">
                Your peer has left the session or lost internet connection. Auto-reconnecting to next stranger in{" "}
                <span className="font-bold text-[#FF4B2B] font-mono">{reconnectCountdown}s</span>.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleStop}
                className="px-4 py-2.5 rounded-[4px] bg-[#18181E] hover:bg-[#22222C] border border-[#2F2F3D] text-xs font-semibold text-[#D0D0D8] flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Return Home</span>
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-[4px] bg-[#FF4B2B] hover:bg-[#E03E20] text-xs font-bold text-white flex items-center space-x-2 shadow-lg"
              >
                <RotateCw className="w-4 h-4" />
                <span>Find Next Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Floating Match Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-[4px] border border-white/10 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-[#E0E0E6]">Stranger</span>
          <span className="text-[#70707A] font-mono text-[10px]">({peerUid.slice(0, 6)})</span>
        </div>
      </div>

      {/* Draggable Self-View Tile */}
      <DraggableSelfView
        stream={localStream}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
      />

      {/* Ephemeral Chat Drawer */}
      <ChatDrawer
        matchId={matchId}
        currentUid={localUid}
        currentDisplayName={displayName}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Idle-Fading Bottom Control Bar */}
      <ControlBar
        onNext={handleNext}
        onStop={handleStop}
        onOpenReport={() => setIsReportOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        isReconnecting={isConnecting}
      />

      {/* Safety Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        onSubmitReport={handleSubmitReport}
      />
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-[#0D0D0F] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#FF4B2B] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallContent />
    </Suspense>
  );
}

