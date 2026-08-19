"use client";

import React, { useRef, useState, useEffect } from "react";
import { Move, Mic, MicOff, Video, VideoOff } from "lucide-react";

interface DraggableSelfViewProps {
  stream: MediaStream | null;
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
}

export const DraggableSelfView: React.FC<DraggableSelfViewProps> = ({
  stream,
  isAudioMuted = false,
  isVideoMuted = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position state (defaults to top-right corner)
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.mouseX;
    const deltaY = e.clientY - dragStartRef.current.mouseY;

    // Bounds checking
    const newX = Math.max(12, Math.min(window.innerWidth - 240, dragStartRef.current.posX + deltaX));
    const newY = Math.max(12, Math.min(window.innerHeight - 180, dragStartRef.current.posY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-30 w-52 sm:w-64 aspect-video bg-[#141417] border border-[#2E2E38] rounded-[6px] shadow-2xl overflow-hidden draggable-tile transition-shadow duration-150 ${
        isDragging ? "shadow-red-500/10 ring-2 ring-[#FF4B2B]/50 cursor-grabbing" : "hover:border-[#3E3E4C]"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover scale-x-[-1] pointer-events-none ${
          isVideoMuted ? "opacity-0" : "opacity-100"
        }`}
      />

      {isVideoMuted && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#141417] text-[#60606B]">
          <VideoOff className="w-8 h-8" />
        </div>
      )}

      {/* Drag handle overlay */}
      <div className="absolute top-2 left-2 p-1 rounded-[4px] bg-black/50 backdrop-blur-sm text-white/70 opacity-80 hover:opacity-100 transition-opacity">
        <Move className="w-3.5 h-3.5" />
      </div>

      {/* Mic status badge */}
      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-[4px] border border-white/10 flex items-center space-x-1 text-[10px] text-[#E0E0E6]">
        {isAudioMuted ? (
          <span className="text-red-400 flex items-center space-x-1">
            <MicOff className="w-3 h-3" />
            <span>Muted</span>
          </span>
        ) : (
          <span className="text-emerald-400 flex items-center space-x-1">
            <Mic className="w-3 h-3" />
            <span>You</span>
          </span>
        )}
      </div>
    </div>
  );
};
