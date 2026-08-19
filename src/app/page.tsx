"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Play, 
  Square, 
  SkipForward, 
  Flag, 
  Globe, 
  Users, 
  User, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Send, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  RotateCw,
  LogIn,
  UserCheck,
  CheckCircle2
} from "lucide-react";
import { 
  getStoredGuestProfile, 
  SupabaseUserProfile, 
  syncSupabaseProfile, 
  signOutSupabase, 
  supabase 
} from "@/lib/supabase";
import { 
  joinSupabaseQueue, 
  leaveSupabaseQueue, 
  subscribeToSupabaseMatch, 
  setupSupabaseWebRTC, 
  sendChatMessage, 
  endMatchSupabase, 
  submitSupabaseReport 
} from "@/lib/supabaseMatchmaking";
import { AuthModal, COUNTRIES } from "@/components/AuthModal";
import { AgeGateModal } from "@/components/AgeGateModal";
import { ReportModal } from "@/components/ReportModal";
import { ReportReason, ChatMessage } from "@/types";

export default function OmeTVMainApp() {
  // User profile
  const [profile, setProfile] = useState<SupabaseUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Filters
  const [selectedCountry, setSelectedCountry] = useState("Worldwide");
  const [selectedGenderFilter, setSelectedGenderFilter] = useState("all");

  // Call & Queue States
  const [appState, setAppState] = useState<"idle" | "searching" | "connected">("idle");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string>("Stranger");
  const [onlineCount, setOnlineCount] = useState<number>(14208);

  // Media
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamMuted, setIsCamMuted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Cleanup ref
  const webrtcCleanupRef = useRef<(() => void) | null>(null);
  const queueSubUnsubRef = useRef<(() => void) | null>(null);

  // Initialize Supabase profile and media
  useEffect(() => {
    const initialProfile = getStoredGuestProfile();
    setProfile(initialProfile);

    // Check existing Supabase session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        syncSupabaseProfile({
          id: data.session.user.id,
          user_id: data.session.user.id,
          username: data.session.user.user_metadata?.username || data.session.user.email?.split("@")[0] || "User",
          email: data.session.user.email,
          country: data.session.user.user_metadata?.country || "Worldwide",
          gender: data.session.user.user_metadata?.gender || "unspecified",
          age_confirmed: true,
          is_guest: false,
          strike_count: 0,
          is_banned: false,
        }).then((p) => setProfile(p));
      }
    });

    // Random fluctuation in online user counter for realism
    const interval = setInterval(() => {
      setOnlineCount((prev) => prev + Math.floor(Math.random() * 9) - 4);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Initialize Camera preview
  useEffect(() => {
    let active = true;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: true,
        });
        if (active) {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
          setCameraError(null);
        }
      } catch (err: any) {
        if (active) {
          setCameraError("Camera/Microphone permission denied. Please allow access in browser settings.");
        }
      }
    }
    startCamera();

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Listen to incoming Supabase chat messages for active match
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`chat_${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            const newMsg: ChatMessage = {
              id: row.id,
              senderUid: row.sender_id,
              senderName: row.sender_name,
              text: row.text,
              timestamp: new Date(row.created_at).getTime(),
              flagged: row.is_flagged,
            };
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Connect WebRTC when matched
  const handleMatched = (newMatchId: string, newPeerId: string, newPeerName: string) => {
    setAppState("connected");
    setMatchId(newMatchId);
    setPeerId(newPeerId);
    setPeerName(newPeerName || "Stranger");
    setMessages([]);

    if (!localStream || !profile) return;

    const webrtcSession = setupSupabaseWebRTC(
      newMatchId,
      profile.id,
      newPeerId,
      localStream,
      (remote) => {
        setRemoteStream(remote);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
        }
      },
      () => {
        // Peer disconnected
        handlePeerDisconnected();
      }
    );

    webrtcCleanupRef.current = webrtcSession.disconnect;
  };

  const handlePeerDisconnected = () => {
    teardownSession();
    // Auto find next stranger
    handleStartOrNext();
  };

  const teardownSession = () => {
    if (webrtcCleanupRef.current) {
      webrtcCleanupRef.current();
      webrtcCleanupRef.current = null;
    }
    if (matchId) {
      endMatchSupabase(matchId, "next");
    }
    setRemoteStream(null);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleStartOrNext = async () => {
    if (!profile) return;

    if (!profile.age_confirmed) {
      setIsAgeModalOpen(true);
      return;
    }

    teardownSession();
    setAppState("searching");
    setMatchId(null);
    setPeerId(null);
    setMessages([]);

    try {
      // 1. Subscribe to match event on user's queue entry
      if (queueSubUnsubRef.current) queueSubUnsubRef.current();
      const unsub = subscribeToSupabaseMatch(profile.id, (result) => {
        handleMatched(result.matchId, result.peerId, result.peerName);
      });
      queueSubUnsubRef.current = unsub;

      // 2. Join queue and check for instant match
      const instantMatch = await joinSupabaseQueue(profile, selectedCountry, selectedGenderFilter);
      if (instantMatch) {
        handleMatched(instantMatch.matchId, instantMatch.peerId, instantMatch.peerName);
      }
    } catch (err: any) {
      alert(err.message || "Matchmaking error");
      setAppState("idle");
    }
  };

  const handleStop = async () => {
    if (profile) {
      leaveSupabaseQueue(profile.id);
    }
    if (queueSubUnsubRef.current) {
      queueSubUnsubRef.current();
      queueSubUnsubRef.current = null;
    }
    teardownSession();
    setAppState("idle");
    setMatchId(null);
    setPeerId(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !matchId || !profile) return;

    const text = chatInput.trim();
    setChatInput("");

    try {
      await sendChatMessage(matchId, profile.id, profile.username, text);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleToggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMicMuted(!isMicMuted);
    }
  };

  const handleToggleCam = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsCamMuted(!isCamMuted);
    }
  };

  const handleConfirmAge = async () => {
    if (!profile) return;
    const updated = { ...profile, age_confirmed: true };
    const saved = await syncSupabaseProfile(updated);
    setProfile(saved);
    setIsAgeModalOpen(false);
    handleStartOrNext();
  };

  const handleSubmitReport = async (reason: ReportReason, captureFrame: boolean) => {
    if (!profile || !peerId || !matchId) return;

    let frameUrl: string | null = null;
    if (captureFrame && remoteVideoRef.current) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = remoteVideoRef.current.videoWidth || 640;
        canvas.height = remoteVideoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(remoteVideoRef.current, 0, 0, canvas.width, canvas.height);
          frameUrl = canvas.toDataURL("image/jpeg", 0.5);
        }
      } catch {}
    }

    await submitSupabaseReport(profile.id, peerId, matchId, reason, frameUrl);
    handleStop();
    alert("User has been reported and disconnected.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0F] text-[#F2F2F0] font-sans select-none">
      {/* OmeTV Header Bar */}
      <header className="h-14 bg-[#141417] border-b border-[#24242C] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-[4px] bg-[#FF4B2B] flex items-center justify-center font-display font-black text-white text-lg tracking-wider">
              V
            </div>
            <span className="font-display font-black text-xl tracking-tight text-[#F2F2F0] uppercase">
              V-CHAT <span className="text-[#FF4B2B] text-xs font-mono font-normal">OMETV</span>
            </span>
          </Link>

          {/* Online Counter */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-[4px] bg-[#0D0D0F] border border-[#22222A] text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#A0A0AA] font-medium">Online:</span>
            <span className="text-white font-mono font-bold">{onlineCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Filters & Profile Controls */}
        <div className="flex items-center space-x-3">
          {/* Country Selector */}
          <div className="flex items-center space-x-1.5 bg-[#0D0D0F] border border-[#262630] rounded-[4px] px-2.5 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-[#FF4B2B]" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-transparent text-[#E0E0E6] text-xs focus:outline-none cursor-pointer"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c} className="bg-[#141417] text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div className="hidden md:flex items-center space-x-1.5 bg-[#0D0D0F] border border-[#262630] rounded-[4px] px-2.5 py-1 text-xs">
            <Users className="w-3.5 h-3.5 text-[#80808A]" />
            <select
              value={selectedGenderFilter}
              onChange={(e) => setSelectedGenderFilter(e.target.value)}
              className="bg-transparent text-[#E0E0E6] text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#141417]">Anyone</option>
              <option value="female" className="bg-[#141417]">Girls Only</option>
              <option value="male" className="bg-[#141417]">Guys Only</option>
            </select>
          </div>

          {/* Account Profile / Sign In */}
          {profile?.is_guest ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] bg-[#1C1C24] hover:bg-[#282834] border border-[#2E2E3C] text-xs font-semibold text-[#F2F2F0] transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-[#FF4B2B]" />
              <span>Make Account</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-[4px] bg-[#1C1C24] hover:bg-[#282834] border border-[#2E2E3C] text-xs font-semibold text-[#F2F2F0] transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[100px] truncate">{profile?.username}</span>
            </button>
          )}
        </div>
      </header>

      {/* Safety Notice Reminder Bar */}
      <div className="bg-[#101014] border-b border-[#202028] px-4 py-1.5 text-center text-[11px] text-[#858592] flex items-center justify-center space-x-2">
        <ShieldCheck className="w-3.5 h-3.5 text-[#FF4B2B]" />
        <span>V-Chat is strictly 18+. Respect community guidelines — no nudity, abuse, or harassment.</span>
      </div>

      {/* Main Dual Screen Video Area */}
      <main className="flex-1 p-2 sm:p-4 flex flex-col max-w-7xl w-full mx-auto justify-between space-y-3">
        {/* Dual Video Screens (Left = You, Right = Stranger) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-[360px]">
          {/* Left Screen: Local Video (You) */}
          <div className="relative bg-[#141417] border border-[#282832] rounded-[6px] overflow-hidden flex items-center justify-center shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] transition-opacity ${
                isCamMuted ? "opacity-0" : "opacity-100"
              }`}
            />

            {isCamMuted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-[#70707C]">
                <VideoOff className="w-12 h-12" />
                <span className="text-xs font-mono">Camera Muted</span>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-black/80 space-y-2">
                <AlertTriangle className="w-8 h-8 text-[#FF4B2B]" />
                <p className="text-xs text-red-300 max-w-xs">{cameraError}</p>
              </div>
            )}

            {/* Local Badge & Controls Overlay */}
            <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-[4px] border border-white/10 text-xs">
              <span className="font-bold text-white">You</span>
              <span className="text-[#858590] text-[11px]">({profile?.country || "Worldwide"})</span>
            </div>

            <div className="absolute top-3 right-3 flex items-center space-x-1.5">
              <button
                onClick={handleToggleMic}
                className={`p-2 rounded-[4px] backdrop-blur-md border transition-colors ${
                  isMicMuted ? "bg-red-950/80 border-red-700 text-red-400" : "bg-black/60 border-white/10 text-white"
                }`}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={handleToggleCam}
                className={`p-2 rounded-[4px] backdrop-blur-md border transition-colors ${
                  isCamMuted ? "bg-red-950/80 border-red-700 text-red-400" : "bg-black/60 border-white/10 text-white"
                }`}
                title={isCamMuted ? "Enable Camera" : "Disable Camera"}
              >
                {isCamMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Right Screen: Remote Video (Stranger) */}
          <div className="relative bg-[#141417] border border-[#282832] rounded-[6px] overflow-hidden flex items-center justify-center shadow-lg">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity ${
                appState === "connected" && remoteStream ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Idle State */}
            {appState === "idle" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-6 text-center">
                <div className="w-16 h-16 rounded-[8px] bg-[#1C1C24] border border-[#2E2E3C] flex items-center justify-center text-[#FF4B2B]">
                  <Play className="w-8 h-8 ml-1 fill-[#FF4B2B]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F2F2F0] font-display">Ready to chat?</h3>
                  <p className="text-xs text-[#80808A] mt-1 max-w-xs">
                    Press <strong className="text-emerald-400">START</strong> or <strong className="text-[#FF4B2B]">NEXT</strong> to connect with random strangers.
                  </p>
                </div>
              </div>
            )}

            {/* Searching State */}
            {appState === "searching" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-6 text-center bg-[#0D0D0F]">
                <div className="w-14 h-14 border-4 border-[#FF4B2B] border-t-transparent rounded-full animate-spin" />
                <div>
                  <h3 className="text-base font-bold text-[#F2F2F0] font-display">Looking for a stranger...</h3>
                  <p className="text-xs text-[#80808A] mt-1 font-mono">
                    Searching in {selectedCountry} • Supabase Realtime
                  </p>
                </div>
              </div>
            )}

            {/* Connected Stranger Badge */}
            {appState === "connected" && (
              <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-[4px] border border-white/10 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-white">{peerName}</span>
                <span className="text-[#858590] text-[11px]">({selectedCountry})</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Chat History Window (Integrated right beneath video panes) */}
        {appState === "connected" && (
          <div className="bg-[#141417] border border-[#24242C] rounded-[6px] p-3 max-h-36 overflow-y-auto space-y-2 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-[11px] text-[#70707C] py-2">
                Connected! Say hi to the stranger in the chat box below.
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderUid === profile?.id;
                return (
                  <div key={m.id} className={`flex items-baseline space-x-2 ${isMe ? "text-[#FF4B2B]" : "text-white"}`}>
                    <strong className="font-semibold">{isMe ? "You" : "Stranger"}:</strong>
                    <span className={m.flagged ? "italic text-red-400" : "text-[#D0D0D8]"}>{m.text}</span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* OmeTV Bottom Control Deck with Exact Buttons */}
        <div className="bg-[#141417] border border-[#24242C] rounded-[6px] p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
          {/* Main Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* START / STOP Toggle Button */}
            {appState === "idle" ? (
              <button
                onClick={handleStartOrNext}
                className="px-6 py-3 rounded-[4px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-wider uppercase flex items-center space-x-2 transition-all shadow-lg active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>START</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-6 py-3 rounded-[4px] bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs tracking-wider uppercase flex items-center space-x-2 transition-all shadow-lg active:scale-95"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>STOP</span>
              </button>
            )}

            {/* NEXT / SKIP Button */}
            <button
              onClick={handleStartOrNext}
              className="px-6 py-3 rounded-[4px] bg-[#FF4B2B] hover:bg-[#E03E20] text-white font-extrabold text-xs tracking-wider uppercase flex items-center space-x-2 transition-all shadow-lg active:scale-95"
            >
              <SkipForward className="w-4 h-4 fill-white" />
              <span>NEXT</span>
            </button>

            {/* REPORT Button */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              disabled={appState !== "connected"}
              className="px-4 py-3 rounded-[4px] bg-[#1C1C24] hover:bg-red-950/40 text-[#A0A0AA] hover:text-red-400 border border-[#2A2A38] hover:border-red-800 text-xs font-semibold uppercase flex items-center space-x-1.5 transition-colors disabled:opacity-40"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">REPORT</span>
            </button>
          </div>

          {/* In-Call Text Message Input */}
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center space-x-2 min-w-[240px]">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={appState !== "connected"}
              placeholder={appState === "connected" ? "Type a message..." : "Start a chat to send messages..."}
              maxLength={400}
              className="flex-1 bg-[#0D0D0F] border border-[#2A2A35] rounded-[4px] px-3.5 py-2.5 text-xs text-[#F2F2F0] placeholder-[#555562] focus:outline-none focus:border-[#FF4B2B] disabled:opacity-40 transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || appState !== "connected"}
              className="p-2.5 rounded-[4px] bg-[#FF4B2B] hover:bg-[#E03E20] text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="h-10 bg-[#0D0D0F] border-t border-[#1C1C24] px-4 flex items-center justify-between text-[11px] text-[#70707C]">
        <div className="flex items-center space-x-3">
          <Link href="/guidelines" className="hover:text-white transition-colors">Community Guidelines</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
        <div className="font-mono text-[10px] text-[#555560]">
          SUPABASE AUTH & REALTIME • WEBRTC P2P
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentProfile={profile}
        onSuccess={(newProf) => setProfile(newProf)}
      />

      {/* Age Gate Modal */}
      <AgeGateModal
        isOpen={isAgeModalOpen}
        onConfirm={handleConfirmAge}
        onClose={() => setIsAgeModalOpen(false)}
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
