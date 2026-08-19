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
  Users2,
  Award,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AgeGateModal } from "@/components/AgeGateModal";
import { AuthModal } from "@/components/AuthModal";
import { ProfileDrawer } from "@/components/ProfileDrawer";
import { RecentConnectionsModal } from "@/components/RecentConnectionsModal";
import { CountrySelector } from "@/components/CountrySelector";
import { COUNTRIES } from "@/lib/data/countries";
import { Gender, UserAccount, UserProfile } from "@/lib/types";

export default function LandingPage() {
  const router = useRouter();
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // User State
  const [user, setUser] = useState<UserAccount | UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [interestsText, setInterestsText] = useState("");

  // OmeTV Filter State
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

    // Sync profile with backend
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
          "Camera or microphone permission was denied. Please allow device access in your browser settings to enter video chat."
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
      const uid = (user as any).id || user.uid;
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
      const uid = (user as any).id || user.uid;
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

  const userUid = user ? (user as any).id || user.uid : "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar
        user={user}
        onOpenAgeGate={() => setIsAgeModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-10 flex flex-col items-center justify-center">
        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-surface border border-surface-border text-xs text-text-muted mb-3 font-mono">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            OME-TV 1:1 WEBRTC VIDEO STREAM
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight text-text">
            TALK TO STRANGERS
          </h1>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            Random 1:1 video chats with country & gender filters. Fast, moderated, no logs.
          </p>
        </div>

        {/* Camera Preview Tile & Controls */}
        <div className="w-full max-w-lg bg-surface border border-surface-border rounded-md overflow-hidden shadow-2xl relative mb-6">
          {/* Video Preview */}
          <div className="relative aspect-video bg-black flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-text-muted">
                <AlertCircle className="w-10 h-10 text-danger mx-auto mb-2" />
                <p className="text-xs text-text font-semibold mb-1">Camera Access Required</p>
                <p className="text-[11px] leading-relaxed text-text-muted">{cameraError}</p>
              </div>
            ) : isVideoMuted ? (
              <div className="flex flex-col items-center justify-center text-text-muted">
                <VideoOff className="w-10 h-10 text-text-dark mb-2" />
                <span className="text-xs">Camera is paused</span>
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
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button
                onClick={toggleMic}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
                className={`p-2 rounded border text-xs ${
                  isMicMuted
                    ? "bg-danger/20 border-danger text-danger"
                    : "bg-surface/80 backdrop-blur-sm border-surface-border text-text hover:bg-surface"
                }`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleVideo}
                title={isVideoMuted ? "Turn Video On" : "Turn Video Off"}
                className={`p-2 rounded border text-xs ${
                  isVideoMuted
                    ? "bg-danger/20 border-danger text-danger"
                    : "bg-surface/80 backdrop-blur-sm border-surface-border text-text hover:bg-surface"
                }`}
              >
                {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            </div>

            {/* Mirror Indicator */}
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm border border-surface-border text-[10px] font-mono text-text-muted">
              Live Preview (Mirrored)
            </div>
          </div>

          {/* Form Controls */}
          <div className="p-5 space-y-4 bg-surface">
            {errorMessage && (
              <div className="p-3 rounded bg-danger/10 border border-danger/40 text-danger text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* OmeTV Filters: Country & Gender Selection */}
            <div className="p-3 bg-background rounded border border-surface-border space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-accent" />
                Matchmaking Filters (OmeTV Style)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-text-dark mb-1">
                    Stranger Country
                  </label>
                  <CountrySelector
                    selectedCountry={preferredCountry}
                    onSelectCountry={setPreferredCountry}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-dark mb-1">
                    Gender Filter
                  </label>
                  <select
                    value={preferredGender}
                    onChange={(e) => setPreferredGender(e.target.value as Gender)}
                    className="w-full px-3 py-1.5 rounded bg-surface border border-surface-border text-xs text-text focus:outline-none focus:border-accent"
                  >
                    <option value="all">Any Gender (Free)</option>
                    <option value="female">Female Only</option>
                    <option value="male">Male Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Nickname & Interests */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-text-dark" />
                  Your Nickname
                </label>
                <input
                  id="nickname-input"
                  type="text"
                  placeholder="Stranger"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={24}
                  className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text placeholder:text-text-dark focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-text-dark" />
                  Interests (Optional)
                </label>
                <input
                  id="interests-input"
                  type="text"
                  placeholder="gaming, music, coding"
                  value={interestsText}
                  onChange={(e) => setInterestsText(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-background border border-surface-border text-xs text-text placeholder:text-text-dark focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Age Gate Warning Status */}
            {!user?.ageConfirmed && (
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Age verification required (18+)</span>
                </div>
                <button
                  onClick={() => setIsAgeModalOpen(true)}
                  className="underline hover:text-amber-200 font-semibold"
                >
                  Verify Now
                </button>
              </div>
            )}

            {/* Start Button */}
            <button
              id="start-chat-button"
              onClick={handleStart}
              disabled={isJoining}
              className={`w-full py-3 rounded text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                !user?.ageConfirmed
                  ? "bg-surface-muted text-text-muted hover:bg-surface-border border border-surface-border cursor-pointer"
                  : "bg-accent hover:bg-accent-hover text-white shadow-lg hover:shadow-accent/20 cursor-pointer active:scale-[0.99]"
              }`}
            >
              {isJoining ? (
                <span>Finding Stranger...</span>
              ) : !user?.ageConfirmed ? (
                <>
                  <Lock className="w-4 h-4" />
                  Confirm 18+ to Start
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  Start Video Chat
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Safety & OmeTV Badges Footer */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs text-text-muted font-medium">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span>Strict 18+ Community</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-accent" />
            <span>Worldwide Matchmaking</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>AI Moderated</span>
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
