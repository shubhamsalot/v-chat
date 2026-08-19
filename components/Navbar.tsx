"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Sparkles, User, History, Zap, Flame, Globe2 } from "lucide-react";
import { UserAccount, UserProfile } from "@/lib/types";

interface NavbarProps {
  user: UserAccount | UserProfile | null;
  onOpenAgeGate?: () => void;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onOpenHistory?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAgeGate,
  onOpenAuth,
  onOpenProfile,
  onOpenHistory,
}) => {
  const [onlineCount, setOnlineCount] = useState(24850);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => prev + Math.floor(Math.random() * 7) - 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full border-b border-white/[0.08] bg-[#090A0F]/80 backdrop-blur-xl z-30 sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Sleek Modern Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center">
            {/* Ambient Neon Glow behind logo */}
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-amber-500 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF334B] via-[#E11D48] to-[#9F1239] p-[1px] flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full rounded-[11px] bg-[#0D0F17] flex items-center justify-center">
                <Zap className="w-5 h-5 text-rose-500 fill-rose-500/30 transform -rotate-12 group-hover:rotate-0 transition-transform" />
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                V<span className="text-rose-500">CHAT</span>
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded-full bg-gradient-to-r from-rose-500/20 to-amber-500/20 border border-rose-500/40 text-rose-400">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">
              Instant 1:1 Video
            </span>
          </div>
        </Link>

        {/* Live Online Badge in Center/Right */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 shadow-inner">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-slate-200">
            {onlineCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400">Online Now</span>
        </div>

        {/* Links & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/community-guidelines"
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            Safety Rules
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              {/* History button */}
              <button
                type="button"
                onClick={onOpenHistory}
                title="Recent Encounters"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all shadow-sm"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Recent</span>
              </button>

              {!user.ageConfirmed && (
                <button
                  onClick={onOpenAgeGate}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 font-semibold transition-all animate-pulse"
                >
                  <Flame className="w-3.5 h-3.5" />
                  18+ Gate
                </button>
              )}

              {/* Profile Card Button */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-white/15 text-xs text-white hover:border-rose-500/50 transition-all shadow-md"
              >
                <img
                  src={
                    user.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      (user as any).id || (user as any).uid
                    )}`
                  }
                  alt="avatar"
                  className="w-5 h-5 rounded-full bg-slate-950 ring-1 ring-white/20"
                />
                <span className="max-w-[100px] truncate font-semibold">
                  {user.displayName}
                </span>
                {user.isAnonymous ? (
                  <span className="text-[10px] text-slate-400 font-mono">Guest</span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400">★ PRO</span>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="text-xs px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-800 text-white font-bold uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 transform active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
