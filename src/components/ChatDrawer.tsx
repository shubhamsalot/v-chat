"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, X, ChevronRight, ShieldAlert } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, push, onValue, off } from "firebase/database";
import { moderateMessageText } from "@/lib/moderation";
import { ChatMessage } from "@/types";

interface ChatDrawerProps {
  matchId: string;
  currentUid: string;
  currentDisplayName: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  matchId,
  currentUid,
  currentDisplayName,
  isOpen,
  onToggle,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matchId) return;

    const messagesRef = ref(rtdb, `matches/${matchId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const msgList: ChatMessage[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        msgList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });

    return () => {
      off(messagesRef);
    };
  }, [matchId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      // Moderate message
      const { isToxic, sanitizedText } = await moderateMessageText(trimmed);

      const messagesRef = ref(rtdb, `matches/${matchId}/messages`);
      const newMsg: Omit<ChatMessage, "id"> = {
        senderUid: currentUid,
        senderName: currentDisplayName,
        text: sanitizedText,
        timestamp: Date.now(),
        flagged: isToxic,
      };

      await push(messagesRef, newMsg);
      setInputText("");
    } catch (err) {
      console.error("Failed to send chat message:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-[#141417] border-l border-[#24242C] shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-[#24242C] flex items-center justify-between bg-[#0D0D0F]">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-[#FF4B2B]" />
          <h3 className="text-sm font-bold text-[#F2F2F0]">Live Chat</h3>
          <span className="text-[10px] text-[#70707A] bg-[#1C1C22] px-2 py-0.5 rounded-[4px] font-mono">
            EPHEMERAL
          </span>
        </div>
        <button
          onClick={onToggle}
          className="text-[#70707A] hover:text-[#F2F2F0] transition-colors p-1 rounded hover:bg-[#1C1C22]"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center py-2 px-3 bg-[#0D0D0F] border border-[#202026] rounded-[4px] text-[11px] text-[#7E7E8A] leading-relaxed">
          <span>You are now connected with a stranger. Messages are ephemeral and removed after the session.</span>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderUid === currentUid;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-[#80808A]">
                <span className="font-semibold text-[#A5A5B0]">
                  {isMe ? "You" : "Stranger"}
                </span>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div
                className={`max-w-[85%] px-3.5 py-2 rounded-[6px] text-xs leading-relaxed ${
                  msg.flagged
                    ? "bg-red-950/40 text-red-300 border border-red-800/40 italic flex items-center space-x-1.5"
                    : isMe
                    ? "bg-[#FF4B2B] text-white font-medium"
                    : "bg-[#1C1C24] text-[#E5E5EB] border border-[#2A2A35]"
                }`}
              >
                {msg.flagged && <ShieldAlert className="w-3.5 h-3.5 shrink-0" />}
                <span>{msg.text}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-[#24242C] bg-[#0D0D0F] flex items-center space-x-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message..."
          maxLength={500}
          className="flex-1 bg-[#141417] border border-[#282832] rounded-[4px] px-3 py-2 text-xs text-[#F2F2F0] placeholder-[#60606A] focus:outline-none focus:border-[#FF4B2B] transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-2 rounded-[4px] bg-[#FF4B2B] hover:bg-[#E03E20] text-white disabled:opacity-40 transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
