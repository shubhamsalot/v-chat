"use client";

import React, { useState } from "react";
import { AlertOctagon, X, Check, ShieldAlert } from "lucide-react";
import { ReportReason } from "@/types";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (reason: ReportReason, captureFrame: boolean) => Promise<void>;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string; urgent?: boolean }[] = [
  {
    value: "nudity",
    label: "Nudity or Sexual Content",
    description: "Broadcasting explicit sexual acts or non-consensual nudity.",
    urgent: true,
  },
  {
    value: "minor_concern",
    label: "Child Safety or Minor Concern",
    description: "Apparent minors or content threatening child protection.",
    urgent: true,
  },
  {
    value: "harassment",
    label: "Harassment or Hate Speech",
    description: "Threats, slurs, doxxing, or extreme verbal hostility.",
  },
  {
    value: "spam",
    label: "Spam or Bot / Prerecorded Feed",
    description: "Automated loops, advertisement feeds, or commercial spam.",
  },
  {
    value: "other",
    label: "Other Community Guideline Violation",
    description: "Any other unsafe or disruptive behavior.",
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>("nudity");
  const [includeSnapshot, setIncludeSnapshot] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitReport(selectedReason, includeSnapshot);
      onClose();
    } catch (err) {
      console.error("Report submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#141417] border border-[#2E2E38] rounded-[6px] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-[4px] bg-[#FF4B2B]/10 border border-[#FF4B2B]/30 flex items-center justify-center text-[#FF4B2B]">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F2F2F0] tracking-tight">
                Report User
              </h2>
              <p className="text-xs text-[#8E8E98]">
                Reporting will immediately disconnect you from this call
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6E6E78] hover:text-[#F2F2F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#A0A0AA]">
              Select Reason
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start space-x-3 p-3 rounded-[4px] border cursor-pointer transition-all ${
                    selectedReason === r.value
                      ? "bg-[#1C1C22] border-[#FF4B2B] text-white"
                      : "bg-[#0D0D0F] border-[#222227] hover:border-[#32323D] text-[#C0C0C8]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.value}
                    checked={selectedReason === r.value}
                    onChange={() => setSelectedReason(r.value)}
                    className="mt-1 accent-[#FF4B2B]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-[#F2F2F0]">{r.label}</span>
                      {r.urgent && (
                        <span className="text-[10px] bg-red-950/80 text-red-400 border border-red-800/50 px-1.5 py-0.2 rounded font-mono font-bold">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#80808A] mt-0.5">{r.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center space-x-2.5 bg-[#0D0D0F] border border-[#222227] p-3 rounded-[4px] cursor-pointer">
            <input
              type="checkbox"
              checked={includeSnapshot}
              onChange={(e) => setIncludeSnapshot(e.target.checked)}
              className="accent-[#FF4B2B] rounded"
            />
            <div className="text-xs text-[#A0A0AA]">
              Attach current video frame as encrypted moderation evidence (retained 90 days).
            </div>
          </label>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-[4px] bg-[#1A1A20] hover:bg-[#24242C] text-xs font-semibold text-[#D0D0D8] border border-[#2C2C36] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-[4px] bg-[#FF4B2B] hover:bg-[#E03E20] text-xs font-bold text-white transition-colors flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Submit & Disconnect</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
