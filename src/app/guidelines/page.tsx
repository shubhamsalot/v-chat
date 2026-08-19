import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AlertTriangle, ArrowLeft, ShieldCheck, HeartHandshake, EyeOff, Ban } from "lucide-react";

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0F]">
      <Header user={null} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-[#80808A] hover:text-[#F2F2F0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to V-Chat</span>
        </Link>

        {/* Legal Draft Advisory Banner */}
        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-[6px] flex items-start space-x-3 text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <strong className="font-bold text-amber-300 block mb-0.5">
              LEGAL & SAFETY DRAFT — REQUIRES FORMAL REVIEW
            </strong>
            These Community Guidelines are a draft policy specification and must be audited by safety and legal specialists before commercial public availability.
          </div>
        </div>

        <div className="bg-[#141417] border border-[#24242C] rounded-[6px] p-6 sm:p-8 space-y-6 text-[#C8C8D2] text-xs leading-relaxed">
          <div className="space-y-1">
            <h1 className="text-2xl font-black font-display text-[#F2F2F0] tracking-tight">
              Community Guidelines & Safety Rules
            </h1>
            <p className="text-[#80808A]">Preserving a respectful, secure, and adult 1:1 video environment</p>
          </div>

          {/* Core Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-[#0D0D0F] border border-[#22222A] p-4 rounded-[6px] space-y-2">
              <div className="flex items-center space-x-2 text-[#FF4B2B]">
                <Ban className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#F2F2F0]">Zero Tolerance for Minors</h3>
              </div>
              <p className="text-[11px] text-[#90909C]">
                V-Chat is strictly 18+. Any presence of minors will result in immediate suspension, evidence archiving, and mandatory reporting to authorities.
              </p>
            </div>

            <div className="bg-[#0D0D0F] border border-[#22222A] p-4 rounded-[6px] space-y-2">
              <div className="flex items-center space-x-2 text-[#FF4B2B]">
                <EyeOff className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#F2F2F0]">No Non-Consensual Nudity</h3>
              </div>
              <p className="text-[11px] text-[#90909C]">
                Broadcasting unsolicited explicit sexual content is prohibited. Users who flash or perform non-consensual acts receive immediate bans.
              </p>
            </div>

            <div className="bg-[#0D0D0F] border border-[#22222A] p-4 rounded-[6px] space-y-2">
              <div className="flex items-center space-x-2 text-[#FF4B2B]">
                <ShieldCheck className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#F2F2F0]">No Harassment or Slurs</h3>
              </div>
              <p className="text-[11px] text-[#90909C]">
                Hate speech, threats of violence, racial slurs, and doxxing are filtered in real-time. Toxic behavior triggers account strikes and blacklisting.
              </p>
            </div>

            <div className="bg-[#0D0D0F] border border-[#22222A] p-4 rounded-[6px] space-y-2">
              <div className="flex items-center space-x-2 text-[#FF4B2B]">
                <HeartHandshake className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#F2F2F0]">Mutual Consent & Dignity</h3>
              </div>
              <p className="text-[11px] text-[#90909C]">
                Always treat strangers with respect. If you encounter uncomfortable or inappropriate behavior, press &quot;Next&quot; or click &quot;Report&quot;.
              </p>
            </div>
          </div>

          <section className="space-y-2 pt-4">
            <h2 className="text-sm font-bold text-[#F2F2F0]">How the Strike System Operates</h2>
            <p>
              When a user is reported with confirmed evidence, a strike is added to their account record in Firestore (`/bans/{'{uid}'}`).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[#A0A0AC]">
              <li><strong className="text-white">1st Strike:</strong> Warning and temporary cooldown.</li>
              <li><strong className="text-white">2nd Strike:</strong> 72-hour queue suspension.</li>
              <li><strong className="text-white">3rd Strike:</strong> Permanent blacklist and exclusion from matchmaking.</li>
              <li><strong className="text-white">High Severity (Nudity/Minor concern):</strong> Instant suspension pending manual review regardless of strike count.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
