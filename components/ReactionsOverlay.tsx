"use client";

import React, { useState, useEffect } from "react";
import { ReactionEvent } from "@/lib/types";
import { soundFX } from "@/lib/audio/sounds";

interface ReactionsOverlayProps {
  reactions: ReactionEvent[];
  onSendReaction: (emoji: string) => void;
}

const EMOJIS = ["❤️", "🔥", "😂", "👏", "😮", "👋", "🚫"];

interface FloatingEmoji {
  id: string;
  emoji: string;
  left: number;
  duration: number;
}

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({
  reactions,
  onSendReaction,
}) => {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const lastProcessedIndexRef = React.useRef(0);

  useEffect(() => {
    if (reactions.length > lastProcessedIndexRef.current) {
      const newItems = reactions.slice(lastProcessedIndexRef.current);
      lastProcessedIndexRef.current = reactions.length;

      newItems.forEach((rx) => {
        soundFX.playReactionSound();
        const floating: FloatingEmoji = {
          id: `${rx.id}_${Math.random()}`,
          emoji: rx.emoji,
          left: Math.floor(Math.random() * 60) + 20, // 20% to 80% screen width
          duration: 2.5 + Math.random() * 1.5,
        };

        setFloatingEmojis((prev) => [...prev, floating]);

        setTimeout(() => {
          setFloatingEmojis((prev) => prev.filter((item) => item.id !== floating.id));
        }, 4000);
      });
    }
  }, [reactions]);

  return (
    <>
      {/* Floating Emojis Container */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{
              left: `${item.left}%`,
              animation: `floatUp ${item.duration}s ease-out forwards`,
            }}
            className="absolute bottom-20 text-3xl sm:text-4xl drop-shadow-lg select-none"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Emoji Reaction Bar in Call */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 bg-surface/80 backdrop-blur-md border border-surface-border rounded-full shadow-lg">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendReaction(emoji)}
            className="w-8 h-8 rounded-full hover:bg-surface-muted active:scale-125 flex items-center justify-center text-lg transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(0.8);
          }
          50% {
            opacity: 1;
            transform: translate3d(15px, -200px, 0) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate3d(-10px, -450px, 0) scale(1);
          }
        }
      `}</style>
    </>
  );
};
