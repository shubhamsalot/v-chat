"use client";

import React, { useState, useEffect } from "react";
import { 
  SkipForward, 
  Square, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MessageSquare, 
  AlertOctagon 
} from "lucide-react";

interface ControlBarProps {
  onNext: () => void;
  onStop: () => void;
  onOpenReport: () => void;
  onToggleChat: () => void;
  isChatOpen: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  isReconnecting?: boolean;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  onNext,
  onStop,
  onOpenReport,
  onToggleChat,
  isChatOpen,
  isAudioMuted,
  isVideoMuted,
  onToggleAudio,
  onToggleVideo,
  isReconnecting = false,
}) => {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleMouseMove = () => {
      setIsIdle(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsIdle(true);
      }, 3000); // Fade after 3 seconds of no mouse movement
    };

    window.addEventListener("mousemove", handleMouseMove);
    timeoutId = setTimeout(() => setIsIdle(true), 3000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 control-bar-container ${
        isIdle ? "idle" : "opacity-100"
      }`}
    >
      <div className="flex items-center space-x-2 bg-[#141417]/90 backdrop-blur-md border border-[#2A2A35] p-2 rounded-[6px] shadow-2xl">
        {/* Next Button (Primary Saturated Red-Orange) */}
        <button
          onClick={onNext}
          disabled={isReconnecting}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-[4px] bg-[#FF4B2B] hover:bg-[#E03E20] text-white font-bold text-xs tracking-wide uppercase transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <SkipForward className="w-4 h-4 fill-white" />
          <span>{isReconnecting ? "Finding..." : "Next"}</span>
        </button>

        {/* Stop Button (Secondary Outlined) */}
        <button
          onClick={onStop}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-[4px] bg-[#18181E] hover:bg-[#22222A] text-[#D0D0D8] border border-[#2F2F3D] font-semibold text-xs tracking-wide uppercase transition-all active:scale-95"
        >
          <Square className="w-3.5 h-3.5" />
          <span>Stop</span>
        </button>

        <div className="h-6 w-[1px] bg-[#2A2A35] mx-1" />

        {/* Media Toggles */}
        <button
          onClick={onToggleAudio}
          title={isAudioMuted ? "Unmute Mic" : "Mute Mic"}
          className={`p-2.5 rounded-[4px] border transition-colors ${
            isAudioMuted
              ? "bg-red-950/50 border-red-800/60 text-red-400"
              : "bg-[#18181E] hover:bg-[#22222A] border-[#2A2A35] text-[#D0D0D8]"
          }`}
        >
          {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleVideo}
          title={isVideoMuted ? "Enable Camera" : "Disable Camera"}
          className={`p-2.5 rounded-[4px] border transition-colors ${
            isVideoMuted
              ? "bg-red-950/50 border-red-800/60 text-red-400"
              : "bg-[#18181E] hover:bg-[#22222A] border-[#2A2A35] text-[#D0D0D8]"
          }`}
        >
          {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>

        {/* Chat Toggle */}
        <button
          onClick={onToggleChat}
          title="Toggle Chat Drawer"
          className={`p-2.5 rounded-[4px] border transition-colors ${
            isChatOpen
              ? "bg-[#FF4B2B]/20 border-[#FF4B2B]/50 text-[#FF4B2B]"
              : "bg-[#18181E] hover:bg-[#22222A] border-[#2A2A35] text-[#D0D0D8]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <div className="h-6 w-[1px] bg-[#2A2A35] mx-1" />

        {/* Report Button (Muted, quiet, always present) */}
        <button
          onClick={onOpenReport}
          title="Report User"
          className="flex items-center space-x-1 px-3 py-2.5 rounded-[4px] bg-transparent hover:bg-red-950/30 text-[#80808A] hover:text-red-400 border border-transparent hover:border-red-900/40 text-xs transition-colors"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Report</span>
        </button>
      </div>
    </div>
  );
};
