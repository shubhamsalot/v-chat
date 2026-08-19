"use client";

import React from "react";
import { ShieldAlert, CheckCircle2, X } from "lucide-react";

interface AgeGateModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({
  isOpen,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#141417] border border-[#2A2A32] rounded-[6px] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-[4px] bg-[#FF4B2B]/10 border border-[#FF4B2B]/30 flex items-center justify-center text-[#FF4B2B]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F2F2F0] tracking-tight">
                Age Verification Required
              </h2>
              <p className="text-xs text-[#8E8E98]">
                Mandatory compliance before entering video queue
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

        <div className="space-y-3 my-5 text-xs text-[#C5C5CE] leading-relaxed bg-[#0D0D0F] p-4 rounded-[4px] border border-[#202026]">
          <p>
            V-Chat is strictly restricted to adults aged <strong className="text-white">18 years or older</strong>.
          </p>
          <p>
            By entering the video queue, you explicitly affirm that:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[#A5A5B0]">
            <li>You are at least 18 years of age.</li>
            <li>You will not broadcast illicit, predatory, non-consensual, or abusive material.</li>
            <li>You acknowledge that severe violations trigger instant account bans and reporting to authorities.</li>
          </ul>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-[4px] bg-[#1C1C22] hover:bg-[#25252E] text-xs font-semibold text-[#D0D0D8] border border-[#2E2E38] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-[4px] bg-[#FF4B2B] hover:bg-[#E03E20] text-xs font-bold text-white transition-colors flex items-center justify-center space-x-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>I Am 18 or Older</span>
          </button>
        </div>
      </div>
    </div>
  );
};
