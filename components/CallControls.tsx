"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  FastForward,
  Square,
  MessageSquare,
  Flag,
  Loader2,
} from "lucide-react";

interface CallControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isChatOpen: boolean;
  unreadCount?: number;
  isRequeueing?: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleChat: () => void;
  onNext: () => void;
  onStop: () => void;
  onOpenReport: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isVideoOff,
  isChatOpen,
  unreadCount = 0,
  isRequeueing = false,
  onToggleMic,
  onToggleVideo,
  onToggleChat,
  onNext,
  onStop,
  onOpenReport,
}) => {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleActivity = () => {
      setIsIdle(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsIdle(true);
      }, 3000);
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    timeout = setTimeout(() => {
      setIsIdle(true);
    }, 3000);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, []);

  return (
    <div
      id="call-control-bar"
      onMouseEnter={() => setIsIdle(false)}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-300 ${
        isIdle ? "opacity-25 hover:opacity-100" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-2.5 bg-surface/90 backdrop-blur-md border border-surface-border rounded-md shadow-2xl">
        {/* Stop Button (Secondary Outlined) */}
        <button
          id="stop-call-button"
          onClick={onStop}
          title="Stop & Leave Call"
          className="flex items-center gap-1.5 px-3 py-2 rounded border border-surface-border hover:border-danger hover:bg-danger/10 text-text hover:text-danger text-xs font-bold uppercase tracking-wider transition-all"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Stop</span>
        </button>

        {/* Next Button (Primary Filled Accent #FF4B2B) */}
        <button
          id="next-stranger-button"
          onClick={onNext}
          disabled={isRequeueing}
          title="Find Next Stranger"
          className="flex items-center gap-1.5 px-4 py-2 rounded bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          {isRequeueing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FastForward className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Next</span>
        </button>

        <div className="w-[1px] h-6 bg-surface-border mx-1" />

        {/* Mic Toggle */}
        <button
          id="toggle-mic-button"
          onClick={onToggleMic}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
          className={`p-2 rounded border transition-colors ${
            isMuted
              ? "bg-danger/10 border-danger/40 text-danger"
              : "bg-surface-muted border-surface-border text-text hover:bg-surface-border"
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Video Toggle */}
        <button
          id="toggle-video-button"
          onClick={onToggleVideo}
          title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          className={`p-2 rounded border transition-colors ${
            isVideoOff
              ? "bg-danger/10 border-danger/40 text-danger"
              : "bg-surface-muted border-surface-border text-text hover:bg-surface-border"
          }`}
        >
          {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>

        {/* Chat Drawer Toggle */}
        <button
          id="toggle-chat-button"
          onClick={onToggleChat}
          title="Toggle Text Chat"
          className={`relative p-2 rounded border transition-colors ${
            isChatOpen
              ? "bg-accent-subtle border-accent/40 text-accent"
              : "bg-surface-muted border-surface-border text-text hover:bg-surface-border"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {unreadCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Report Button (Small, muted, always present) */}
        <button
          id="open-report-button"
          onClick={onOpenReport}
          title="Report Inappropriate Behavior"
          className="p-2 rounded border border-transparent hover:border-surface-border text-text-dark hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
