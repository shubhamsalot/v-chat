"use client";

import React from "react";
import Link from "next/link";
import { Shield, Sparkles, User, AlertCircle, History, Award } from "lucide-react";
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
  return (
    <header className="w-full border-b border-surface-border bg-background/95 backdrop-blur-sm z-30 sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center font-bold text-white text-base tracking-tighter shadow-sm">
            V
          </div>
          <span className="font-display text-lg tracking-wider font-extrabold text-text">
            V-CHAT
          </span>
          <span className="text-[10px] tracking-widest uppercase font-mono px-1.5 py-0.5 rounded bg-surface-muted text-text-muted border border-surface-border ml-1">
            OME-TV
          </span>
        </Link>

        {/* Links & Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-text-muted">
            <Link
              href="/community-guidelines"
              className="hover:text-text transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5 text-accent" />
              Safety Rules
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              {/* History button */}
              <button
                type="button"
                onClick={onOpenHistory}
                title="Recent Encounters"
                className="p-1.5 rounded bg-surface border border-surface-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors flex items-center gap-1 text-xs"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Recent</span>
              </button>

              {!user.ageConfirmed && (
                <button
                  onClick={onOpenAgeGate}
                  className="hidden sm:flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                >
                  <AlertCircle className="w-3 h-3" />
                  Confirm 18+
                </button>
              )}

              {/* Profile Card Button */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-2.5 py-1 rounded bg-surface border border-surface-border text-xs text-text hover:bg-surface-muted transition-colors"
              >
                <img
                  src={
                    user.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      (user as any).id || user.uid
                    )}`
                  }
                  alt="avatar"
                  className="w-5 h-5 rounded-full bg-background"
                />
                <span className="max-w-[90px] truncate font-medium">
                  {user.displayName}
                </span>
                {user.isAnonymous ? (
                  <span className="text-[10px] text-text-muted">(Guest)</span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400">★</span>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="text-xs px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              Sign In / Sign Up
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
