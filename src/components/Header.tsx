"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Video, Lock, ExternalLink } from "lucide-react";
import { UserProfile } from "@/types";

interface HeaderProps {
  user: UserProfile | null;
  onGoogleSignIn?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onGoogleSignIn }) => {
  return (
    <header className="w-full bg-[#0D0D0F] border-b border-[#222227] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 rounded-[4px] bg-[#FF4B2B] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            V
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight text-[#F2F2F0] group-hover:text-white transition-colors">
            V-CHAT
          </span>
        </Link>
        <span className="text-xs text-[#80808A] px-2 py-0.5 rounded-[4px] bg-[#141417] border border-[#2A2A32] font-mono">
          1:1 ENCRYPTED
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-3 text-xs text-[#A0A0AA]">
          <Link href="/guidelines" className="hover:text-[#F2F2F0] transition-colors">
            Guidelines
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-[#F2F2F0] transition-colors">
            Terms
          </Link>
        </div>

        {user ? (
          <div className="flex items-center space-x-2 bg-[#141417] border border-[#24242C] px-3 py-1.5 rounded-[4px] text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#D0D0D6] font-medium truncate max-w-[120px]">
              {user.displayName}
            </span>
            {user.isAnonymous && onGoogleSignIn && (
              <button
                onClick={onGoogleSignIn}
                className="ml-2 text-[#FF4B2B] hover:underline font-semibold"
              >
                Sign In
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onGoogleSignIn}
            className="px-3 py-1.5 rounded-[4px] bg-[#141417] hover:bg-[#202026] text-xs text-[#F2F2F0] border border-[#2E2E38] transition-colors"
          >
            Google Sign In
          </button>
        )}
      </div>
    </header>
  );
};
