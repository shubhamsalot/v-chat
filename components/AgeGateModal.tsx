"use client";

import React, { useState } from "react";
import { ShieldAlert, Check, X, Lock } from "lucide-react";

interface AgeGateModalProps {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onClose?: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({
  isOpen,
  onConfirm,
  onClose,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!isChecked || loading) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-surface border border-surface-border rounded-md shadow-2xl p-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-muted hover:text-text p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="w-12 h-12 rounded bg-accent-subtle border border-accent/30 flex items-center justify-center mb-4 text-accent">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-text mb-2 tracking-tight">
          Age Verification & Community Standard
        </h3>

        <p className="text-sm text-text-muted mb-4 leading-relaxed">
          V-Chat connects you with random strangers via live 1:1 video call. To ensure a safe environment:
        </p>

        <div className="space-y-2 mb-5 text-xs text-text-muted bg-background p-3 rounded border border-surface-border">
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
            <span>You must be at least <strong>18 years old</strong> to use this service.</span>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
            <span>Harmful conduct, nudity, harassment, and minor exploitation are <strong>strictly prohibited</strong> and result in immediate permanent bans and law enforcement reporting.</span>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" />
            <span>Automated AI moderation and player reporting are active across all sessions.</span>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none mb-6 p-2 rounded hover:bg-surface-muted transition-colors">
          <input
            type="checkbox"
            id="age-confirmation-checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-surface-border text-accent focus:ring-accent bg-background"
          />
          <span className="text-xs text-text font-medium leading-normal">
            I certify under penalty of account suspension that I am 18 years of age or older, and agree to the Community Guidelines.
          </span>
        </label>

        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded border border-surface-border text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            id="confirm-age-button"
            onClick={handleAccept}
            disabled={!isChecked || loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
              isChecked && !loading
                ? "bg-accent hover:bg-accent-hover text-white cursor-pointer"
                : "bg-surface-muted text-text-dark cursor-not-allowed border border-surface-border"
            }`}
          >
            {loading ? (
              <span>Verifying...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Confirm & Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
