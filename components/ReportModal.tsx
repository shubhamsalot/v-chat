"use client";

import React, { useState } from "react";
import { AlertTriangle, X, Shield, Check } from "lucide-react";
import { ReportReason } from "@/lib/types";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (reason: ReportReason) => Promise<void>;
}

const REPORT_OPTIONS: { id: ReportReason; label: string; description: string; urgent?: boolean }[] = [
  {
    id: "nudity",
    label: "Nudity or Sexual Content",
    description: "Displaying explicit content, genitalia, or sexual acts.",
    urgent: true,
  },
  {
    id: "minor_concern",
    label: "Child Safety or Minor Concern",
    description: "Suspected underage participant or any form of child endangerment.",
    urgent: true,
  },
  {
    id: "harassment",
    label: "Harassment or Hate Speech",
    description: "Targeted abuse, slurs, threats, or severe bullying.",
  },
  {
    id: "spam",
    label: "Spam or Bot / Promotional",
    description: "Automated video stream, advertisement, or repetitive spam.",
  },
  {
    id: "other",
    label: "Other Inappropriate Behavior",
    description: "Other behavior violating Community Guidelines.",
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitReport(selectedReason);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-surface border border-surface-border rounded-md shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded bg-danger/10 border border-danger/30 flex items-center justify-center text-danger">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text">Report Participant</h3>
            <p className="text-[11px] text-text-muted">
              Submitting a report immediately terminates this video call.
            </p>
          </div>
        </div>

        <div className="space-y-2 my-4">
          {REPORT_OPTIONS.map((opt) => {
            const isSelected = selectedReason === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                id={`report-reason-${opt.id}`}
                onClick={() => setSelectedReason(opt.id)}
                className={`w-full text-left p-3 rounded border text-xs transition-all flex items-start justify-between ${
                  isSelected
                    ? "bg-danger/10 border-danger text-text shadow-sm"
                    : "bg-background border-surface-border text-text-muted hover:text-text hover:border-surface-border/80 hover:bg-surface-muted"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-semibold text-text">
                    <span>{opt.label}</span>
                    {opt.urgent && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-danger/20 text-danger uppercase">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5 leading-snug">
                    {opt.description}
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ml-2 ${
                    isSelected
                      ? "border-danger bg-danger text-white"
                      : "border-surface-border bg-surface"
                  }`}
                >
                  {isSelected && <Check className="w-2.5 h-2.5" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-text-dark mb-5">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>Reports are reviewed by automated systems and human moderators.</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded border border-surface-border text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
          >
            Cancel
          </button>
          <button
            id="submit-report-button"
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
              selectedReason && !isSubmitting
                ? "bg-danger hover:bg-red-600 text-white cursor-pointer"
                : "bg-surface-muted text-text-dark cursor-not-allowed border border-surface-border"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit & Disconnect"}
          </button>
        </div>
      </div>
    </div>
  );
};
