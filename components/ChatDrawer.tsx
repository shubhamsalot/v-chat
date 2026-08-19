"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, ShieldAlert, Sparkles } from "lucide-react";
import { ChatMessage } from "@/lib/types";

interface ChatDrawerProps {
  isOpen: boolean;
  messages: ChatMessage[];
  currentUid: string;
  onClose: () => void;
  onSendMessage: (text: string) => Promise<void>;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  messages,
  currentUid,
  onClose,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);
    try {
      await onSendMessage(textToSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <aside
      id="chat-drawer"
      className={`fixed top-0 right-0 bottom-0 z-40 w-80 sm:w-96 bg-surface/95 backdrop-blur-md border-l border-surface-border flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-text">
            Text Chat (Ephemeral)
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Safety Notice Banner */}
      <div className="px-3 py-2 bg-background border-b border-surface-border flex items-center gap-2 text-[11px] text-text-muted">
        <ShieldAlert className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>Automated moderation active. Messages are never stored permanently.</span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-muted text-xs p-4">
            <Sparkles className="w-6 h-6 text-text-dark mb-2" />
            <p>You are now connected with a stranger.</p>
            <p className="text-[11px] text-text-dark mt-1">Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUid === currentUid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] font-mono text-text-dark mb-0.5">
                  {isMe ? "You" : msg.senderName}
                </span>
                <div
                  className={`max-w-[85%] rounded px-3 py-2 text-xs leading-relaxed ${
                    msg.isFlagged
                      ? "bg-danger/10 border border-danger/40 text-danger italic"
                      : isMe
                      ? "bg-accent text-white font-medium"
                      : "bg-surface-muted border border-surface-border text-text"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-surface-border bg-background flex items-center gap-2"
      >
        <input
          id="chat-message-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 px-3 py-2 rounded bg-surface border border-surface-border text-xs text-text placeholder:text-text-dark focus:outline-none focus:border-accent"
        />
        <button
          id="send-chat-button"
          type="submit"
          disabled={!inputText.trim() || sending}
          className="p-2 rounded bg-accent hover:bg-accent-hover text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </aside>
  );
};
