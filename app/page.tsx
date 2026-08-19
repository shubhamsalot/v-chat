"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ArrowRight,
  AlertCircle,
  Lock,
  User,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AgeGateModal } from "@/components/AgeGateModal";
import { AuthModal } from "@/components/AuthModal";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { RecentConnectionsModal } from "@/components/RecentConnectionsModal";
import { CountrySelector } from "@/components/CountrySelector";
import { Gender, UserAccount, UserProfile } from "@/lib/types";

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
        console.warn("[Media] Camera access error:", err);
        setCameraError(
          "Please enable camera permissions in your browser to start video chat."
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
      setErrorMessage("Network error occurred while connecting.");
      setIsJoining(false);
    }
  };

  const userUid = user ? (user as any).id || (user as any).uid || "" : "";

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col justify-between select-none">
      <Navbar
        user={user}
        onOpenAgeGate={() => setIsAgeModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full">
        {/* Minimal Clean Card */}
        <div className="w-full bg-slate-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Camera View Box */}
          <div className="relative aspect-video bg-black flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-slate-400">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                <p className="text-xs text-white font-bold mb-1">Camera Access Required</p>
                <p className="text-[11px] text-slate-400">{cameraError}</p>
              </div>
            ) : isVideoMuted ? (
              <div className="flex flex-col items-center justify-center text-slate-500">
                <VideoOff className="w-10 h-10 text-slate-600 mb-1" />
                <span className="text-xs">Camera paused</span>
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

            {/* In-Camera Quick Toggle */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button
                onClick={toggleMic}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
                className={`p-2 rounded-lg border text-xs backdrop-blur-md transition-colors ${
                  isMicMuted
                    ? "bg-rose-500/25 border-rose-500 text-rose-400"
                    : "bg-black/60 border-white/15 text-white hover:bg-black/80"
                }`}
              >
                {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={toggleVideo}
                title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
                className={`p-2 rounded-lg border text-xs backdrop-blur-md transition-colors ${
                  isVideoMuted
                    ? "bg-rose-500/25 border-rose-500 text-rose-400"
                    : "bg-black/60 border-white/15 text-white hover:bg-black/80"
                }`}
              >
                {isVideoMuted ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-medium text-slate-300">
              Live Preview
            </div>
          </div>

          {/* Form & Actions */}
          <div className="p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Clean Inputs Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Country
                </label>
                <CountrySelector
                  selectedCountry={preferredCountry}
                  onSelectCountry={setPreferredCountry}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  placeholder="Stranger"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={20}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Optional Topic Tag Input */}
            <div>
              <input
                type="text"
                placeholder="Interests (optional, e.g. gaming, music)"
                value={interestsText}
                onChange={(e) => setInterestsText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Age Gate Warning Status if unconfirmed */}
            {!user?.ageConfirmed && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-center justify-between">
                <span>Age verification required (18+)</span>
                <button
                  onClick={() => setIsAgeModalOpen(true)}
                  className="underline hover:text-amber-200 font-bold"
                >
                  Verify Now
                </button>
              </div>
            )}

            {/* Main Action Button */}
            <button
              id="start-chat-button"
              onClick={handleStart}
              disabled={isJoining}
              className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                !user?.ageConfirmed
                  ? "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-white/10 cursor-pointer"
                  : "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-rose-500/25 cursor-pointer active:scale-[0.98]"
              }`}
            >
              {isJoining ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : !user?.ageConfirmed ? (
                <>
                  <Lock className="w-4 h-4" />
                  Confirm 18+ to Start
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  Start Video Chat
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="text-center py-4 text-xs text-slate-500">
        18+ Only • Ephemeral P2P WebRTC • Moderated for Safety
      </footer>

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
