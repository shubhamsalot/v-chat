"use client";

import React, { useState, useEffect } from "react";
import { X, History, User, Globe, MessageSquare, Clock } from "lucide-react";
import { ConnectionRecord } from "@/lib/types";

interface RecentConnectionsModalProps {
  isOpen: boolean;
  uid: string;
  onClose: () => void;
}

export const RecentConnectionsModal: React.FC<RecentConnectionsModalProps> = ({
  isOpen,
  uid,
  onClose,
}) => {
  const [history, setHistory] = useState<ConnectionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && uid) {
      setLoading(true);
      fetch(`/api/history?uid=${encodeURIComponent(uid)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.history) {
            setHistory(data.history);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, uid]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-surface border border-surface-border rounded-md shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded bg-accent-subtle border border-accent/30 flex items-center justify-center text-accent">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text">Recent Encounters</h3>
            <p className="text-[11px] text-text-muted">
              Recent strangers you connected with on V-Chat
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-text-muted">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-muted">
              No recent connections yet. Start video chat to meet strangers!
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 rounded bg-background border border-surface-border"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      record.peerAvatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        record.peerUid
                      )}`
                    }
                    alt="avatar"
                    className="w-9 h-9 rounded-full bg-surface border border-surface-border"
                  />
                  <div>
                    <div className="text-xs font-bold text-text flex items-center gap-1.5">
                      <span>{record.peerDisplayName}</span>
                      {record.peerCountry && record.peerCountry !== "GLOBAL" && (
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-surface border border-surface-border text-text-muted">
                          {record.peerCountry}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-text-dark flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(record.connectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
