"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Shield,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Tag,
  Lock,
  User,
  Globe,
  Flame,
  Zap,
  Radio,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AgeGateModal } from "@/components/AgeGateModal";
import { AuthModal } from "@/components/AuthModal";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { RecentConnectionsModal } from "@/components/RecentConnectionsModal";
import { CountrySelector } from "@/components/CountrySelector";
import { COUNTRIES } from "@/lib/data/countries";
import { Gender, UserAccount, UserProfile } from "@/lib/types";

const TRENDING_TAGS = [
  { icon: "🎮", label: "Gaming" },
  { icon: "🎵", label: "Music" },
  { icon: "☕", label: "Late Night Chill" },
  { icon: "🌎", label: "Language Exchange" },
  { icon: "🍿", label: "Anime & Movies" },
  { icon: "💻", label: "Tech & Code" },
  { icon: "🎨", label: "Art & Design" },
];

export default function LandingPage() {
  const router = useRouter();
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // User State
  const [user, setUser] = useState<UserAccount | UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [interestsText, setInterestsText] = useState("");

  // Filter State
  const [preferredCountry, setPreferredCountry] = useState("GLOBAL");
  const [preferredGender, setPreferredGender] = useState<Gender>("all");

  // Media State
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // Modals & Status
  const [isAgeModalOpen, setIsAgeModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Initialize anonymous user & restore profile from localStorage
  useEffect(() => {
    let storedUid = localStorage.getItem("vchat_uid");
    if (!storedUid) {
      storedUid = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem("vchat_uid", storedUid);
    }

    const storedAgeConfirmed = localStorage.getItem("vchat_age_confirmed") === "true";
    const storedNickname = localStorage.getItem("vchat_nickname") || "Stranger";
    const storedCountry = localStorage.getItem("vchat_pref_country") || "GLOBAL";
    const storedGender = (localStorage.getItem("vchat_pref_gender") as Gender) || "all";

    setNickname(storedNickname !== "Stranger" ? storedNickname : "");
    setPreferredCountry(storedCountry);
    setPreferredGender(storedGender);

    const initialUser: UserProfile = {
      uid: storedUid,
      displayName: storedNickname,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(storedUid)}`,
      createdAt: Date.now(),
      ageConfirmed: storedAgeConfirmed,
      isAnonymous: true,
      country: storedCountry,
      gender: storedGender,
    };
    setUser(initialUser);

    fetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(initialUser),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setUser(data.profile);
        }
      })
      .catch((err) => console.warn("[Auth] Sync warning:", err));
  }, []);

  // 2. Immediate Camera & Mic Preview
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initMedia() {
      try {
        setCameraError(null);
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: true,
        });
        setMediaStream(localStream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = localStream;
        }
      } catch (err: any) {
        console.warn("[Media] Camera/Mic access denied:", err);
        setCameraError(
          "Camera or microphone access was denied. Please allow camera permissions to chat."
        );
      }
    }

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Toggle Mute / Cam on Landing
  const toggleMic = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  // Toggle trending tag in input
  const handleTagClick = (tagLabel: string) => {
    const existing = interestsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (existing.includes(tagLabel)) {
      setInterestsText(existing.filter((t) => t !== tagLabel).join(", "));
    } else {
      setInterestsText([...existing, tagLabel].join(", "));
    }
  };

  // Age confirmation handler
  const handleConfirmAge = async () => {
    if (!user) return;
    try {
      const uid = (user as any).id || (user as any).uid;
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          displayName: nickname || "Stranger",
          ageConfirmed: true,
          isAnonymous: user.isAnonymous,
          country: preferredCountry,
          gender: preferredGender,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        setUser(data.profile);
        localStorage.setItem("vchat_age_confirmed", "true");
      }
      setIsAgeModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Auth Success Callback
  const handleAuthSuccess = (account: UserAccount) => {
    setUser(account);
    setNickname(account.displayName);
    setPreferredCountry(account.country || "GLOBAL");
    setPreferredGender(account.gender || "all");
    localStorage.setItem("vchat_uid", account.id);
    localStorage.setItem("vchat_nickname", account.displayName);
    localStorage.setItem("vchat_age_confirmed", "true");
    localStorage.setItem("vchat_pref_country", account.country || "GLOBAL");
    localStorage.setItem("vchat_pref_gender", account.gender || "all");
  };

  // Sign out / reset
  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  // Start Video Queue Join
  const handleStart = async () => {
    if (!user) return;

    if (!user.ageConfirmed) {
      setIsAgeModalOpen(true);
      return;
    }

    setIsJoining(true);
    setErrorMessage(null);

    const displayName = nickname.trim() || user.displayName || "Stranger";
    localStorage.setItem("vchat_nickname", displayName);
    localStorage.setItem("vchat_pref_country", preferredCountry);
    localStorage.setItem("vchat_pref_gender", preferredGender);

    const interests = interestsText
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    try {
      const uid = (user as any).id || (user as any).uid;
      const res = await fetch("/api/matchmaking/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          displayName,
          interests,
          country: user.country || preferredCountry,
          gender: user.gender || preferredGender,
          preferredCountry,
          preferredGender,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to join queue. Please try again.");
        setIsJoining(false);
        return;
      }

      localStorage.setItem("vchat_interests", JSON.stringify(interests));

      router.push(
        `/call?uid=${encodeURIComponent(uid)}&name=${encodeURIComponent(
          displayName
        )}&country=${encodeURIComponent(preferredCountry)}&gender=${encodeURIComponent(
          preferredGender
        )}`
      );
    } catch (err: any) {
      setErrorMessage("Network error occurred while connecting to matchmaking.");
      setIsJoining(false);
    }
  };

  const userUid = user ? (user as any).id || (user as any).uid || "" : "";

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col relative overflow-hidden">
      {/* Dynamic Background Mesh Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-rose-600/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-rose-600/5 blur-3xl pointer-events-none" />

      <Navbar
        user={user}
        onOpenAgeGate={() => setIsAgeModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center relative z-10">
        {/* Hero Header */}
        <div className="text-center mb-8 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/15 border border-rose-500/30 text-xs font-semibold text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="font-mono tracking-wider uppercase">
              ⚡ LIVE 1:1 WEBRTC VIDEO CALLS
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-sans">
            CONNECT WITH <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF334B] via-[#FF6B7A] to-amber-400">STRANGERS</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
            Instantly pair with random verified adults worldwide. High quality video, country filters, and real-time AI moderation.
          </p>
        </div>

        {/* Video Card Container */}
        <div className="w-full max-w-xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative mb-8 ring-1 ring-white/10 group">
          {/* Top Camera Stream Box */}
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
            {cameraError ? (
              <div className="p-6 text-center text-slate-400">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                <p className="text-sm text-white font-bold mb-1">Camera Access Required</p>
                <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
              </div>
            ) : isVideoMuted ? (
              <div className="flex flex-col items-center justify-center text-slate-500">
                <VideoOff className="w-12 h-12 text-slate-600 mb-2" />
                <span className="text-xs font-medium">Camera is paused</span>
              </div>
            ) : (
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}

            {/* Quick Media Controls Badge */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 z-20">
              <button
                onClick={toggleMic}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
                className={`p-2.5 rounded-xl border text-xs backdrop-blur-md transition-all shadow-lg ${
                  isMicMuted
                    ? "bg-rose-500/30 border-rose-500 text-rose-400"
                    : "bg-slate-900/80 border-white/15 text-white hover:bg-slate-800"
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleVideo}
                title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
                className={`p-2.5 rounded-xl border text-xs backdrop-blur-md transition-all shadow-lg ${
                  isVideoMuted
                    ? "bg-rose-500/30 border-rose-500 text-rose-400"
                    : "bg-slate-900/80 border-white/15 text-white hover:bg-slate-800"
                }`}
              >
                {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            </div>

            {/* Live Indicator Pill */}
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 z-20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Self Preview</span>
            </div>
          </div>

          {/* Controls & Form Section */}
          <div className="p-6 space-y-5 bg-gradient-to-b from-slate-900/90 to-slate-950/90">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Matchmaking Filter Bar */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-white/[0.08] space-y-3 shadow-inner">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-rose-500" />
                  <span>Matching Filters</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">100% Free</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Country Target
                  </label>
                  <CountrySelector
                    selectedCountry={preferredCountry}
                    onSelectCountry={setPreferredCountry}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Gender Filter
                  </label>
                  <select
                    value={preferredGender}
                    onChange={(e) => setPreferredGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
                  >
                    <option value="all">Any Gender (Worldwide)</option>
                    <option value="female">Female Match</option>
                    <option value="male">Male Match</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Nickname & Interests */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-500" />
                  Your Nickname
                </label>
                <input
                  id="nickname-input"
                  type="text"
                  placeholder="Stranger"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={24}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-rose-500" />
                  Interests
                </label>
                <input
                  id="interests-input"
                  type="text"
                  placeholder="gaming, music, anime"
                  value={interestsText}
                  onChange={(e) => setInterestsText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            </div>

            {/* Trending Interests Quick Pills */}
            <div>
              <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" />
                <span>Trending Topics (Click to add)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_TAGS.map((tag) => {
                  const isSelected = interestsText.toLowerCase().includes(tag.label.toLowerCase());
                  return (
                    <button
                      key={tag.label}
                      type="button"
                      onClick={() => handleTagClick(tag.label)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                        isSelected
                          ? "bg-rose-500/20 border-rose-500 text-rose-300 font-bold shadow-sm"
                          : "bg-slate-950/80 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <span>{tag.icon}</span>
                      <span>{tag.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Age Gate Warning Status if unconfirmed */}
            {!user?.ageConfirmed && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Age verification required (18+)</span>
                </div>
                <button
                  onClick={() => setIsAgeModalOpen(true)}
                  className="underline hover:text-amber-200 font-bold text-xs"
                >
                  Verify 18+
                </button>
              </div>
            )}

            {/* Glowing Call Start Button */}
            <button
              id="start-chat-button"
              onClick={handleStart}
              disabled={isJoining}
              className={`w-full py-4 rounded-xl text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                !user?.ageConfirmed
                  ? "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-white/10 cursor-pointer"
                  : "bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white shadow-rose-500/30 hover:shadow-rose-500/50 cursor-pointer active:scale-[0.98] animate-glow"
              }`}
            >
              {isJoining ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting to Stranger...</span>
                </div>
              ) : !user?.ageConfirmed ? (
                <>
                  <Lock className="w-4 h-4" />
                  Confirm 18+ to Start
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-white" />
                  Start Video Chat
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl text-center">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-md">
            <div className="text-rose-400 font-extrabold text-sm mb-0.5 flex items-center justify-center gap-1">
              <Zap className="w-4 h-4" /> Ultra-Fast WebRTC
            </div>
            <div className="text-[11px] text-slate-400">Direct peer-to-peer live streaming</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-md">
            <div className="text-amber-400 font-extrabold text-sm mb-0.5 flex items-center justify-center gap-1">
              <Shield className="w-4 h-4" /> Perspective AI
            </div>
            <div className="text-[11px] text-slate-400">Automated toxic message filtering</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-md">
            <div className="text-emerald-400 font-extrabold text-sm mb-0.5 flex items-center justify-center gap-1">
              <Globe className="w-4 h-4" /> Global Reach
            </div>
            <div className="text-[11px] text-slate-400">22+ countries supported</div>
          </div>
        </div>
      </main>

      <AgeGateModal
        isOpen={isAgeModalOpen}
        onConfirm={handleConfirmAge}
        onClose={() => setIsAgeModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <ProfileDrawer
        isOpen={isProfileOpen}
        user={user}
        onClose={() => setIsProfileOpen(false)}
        onUpdate={(updated) => setUser((prev: any) => ({ ...prev, ...updated }))}
        onLogout={handleLogout}
      />

      <RecentConnectionsModal
        isOpen={isHistoryOpen}
        uid={userUid}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
