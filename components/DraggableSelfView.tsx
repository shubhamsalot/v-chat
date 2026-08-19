"use client";

import React, { useRef, useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, Move } from "lucide-react";

interface DraggableSelfViewProps {
  stream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  displayName: string;
}

export const DraggableSelfView: React.FC<DraggableSelfViewProps> = ({
  stream,
  isMuted,
  isVideoOff,
  displayName,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position state (defaults to top right)
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 20,
    y: 20,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 20,
    posY: 20,
  });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary mouse or single touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    // Bounds checking
    const containerWidth = 240;
    const containerHeight = 140;
    const maxX = window.innerWidth - containerWidth - 10;
    const maxY = window.innerHeight - containerHeight - 80;

    const newX = Math.max(10, Math.min(maxX, dragStartRef.current.posX + deltaX));
    const newY = Math.max(10, Math.min(maxY, dragStartRef.current.posY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  return (
    <div
      ref={containerRef}
      id="self-view-draggable-tile"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: "none",
      }}
      className={`fixed top-0 left-0 z-40 w-48 sm:w-60 aspect-video rounded-md overflow-hidden bg-surface border ${
        isDragging ? "border-accent shadow-2xl scale-[1.02]" : "border-surface-border shadow-lg"
      } select-none cursor-grab active:cursor-grabbing transition-shadow transition-transform duration-75`}
    >
      {/* Live Video */}
      {!isVideoOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface text-text-muted">
          <VideoOff className="w-6 h-6 mb-1 text-text-dark" />
          <span className="text-[11px] font-medium">Camera Off</span>
        </div>
      )}

      {/* Drag Overlay & Header Tag */}
      <div className="absolute inset-x-0 top-0 p-1.5 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between text-[11px] text-text font-medium pointer-events-none">
        <div className="flex items-center gap-1">
          <Move className="w-3 h-3 text-text-muted" />
          <span className="truncate max-w-[90px]">{displayName} (You)</span>
        </div>
        <div className="flex items-center gap-1">
          {isMuted ? (
            <MicOff className="w-3 h-3 text-danger" />
          ) : (
            <Mic className="w-3 h-3 text-success" />
          )}
          {isVideoOff ? (
            <VideoOff className="w-3 h-3 text-danger" />
          ) : (
            <Video className="w-3 h-3 text-success" />
          )}
        </div>
      </div>
    </div>
  );
};
