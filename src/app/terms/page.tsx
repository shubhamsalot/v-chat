import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react";

export default function TermsPage() {
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

        {/* Mandatory Legal Draft Banner */}
        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-[6px] flex items-start space-x-3 text-amber-200 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <strong className="font-bold text-amber-300 block mb-0.5">
              LEGAL DRAFT — REQUIRES FORMAL LEGAL COUNSEL REVIEW
            </strong>
            This document is a technical and product specification draft provided for informational architecture purposes. It does not constitute formal legal advice and MUST undergo professional legal and regulatory review before public deployment.
          </div>
        </div>

        <div className="bg-[#141417] border border-[#24242C] rounded-[6px] p-6 sm:p-8 space-y-6 text-[#C8C8D2] text-xs leading-relaxed">
          <h1 className="text-2xl font-black font-display text-[#F2F2F0] tracking-tight">
            Terms of Service (Draft)
          </h1>
          <p className="text-[#80808A]">Last Updated: August 2026</p>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#F2F2F0]">1. Age Restriction (Strict 18+ Gate)</h2>
            <p>
              V-Chat is exclusively intended for adults aged 18 and older. Any access, registration, or use of the platform by individuals under 18 is strictly prohibited and constitutes a direct breach of these Terms. We reserve the right to immediately terminate accounts and ban IP/device signatures suspected of minor involvement.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#F2F2F0]">2. Nature of the Service & Ephemeral P2P Streaming</h2>
            <p>
              V-Chat facilitates real-time, peer-to-peer WebRTC video and audio connections between arbitrary users. We do not store, record, or retain live video or audio streams on central servers. Real-time text communications are ephemeral and deleted after 24 hours.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#F2F2F0]">3. Prohibited Conduct & Immediate Bans</h2>
            <p>Users agree NOT to transmit, broadcast, or display:</p>
            <ul className="list-disc pl-5 space-y-1 text-[#A0A0AC]">
              <li>Child sexual abuse material (CSAM) or any content endangering minors (reported immediately to NCMEC and law enforcement).</li>
              <li>Non-consensual sexual content, explicit acts without bilateral adult consent, or sexual violence.</li>
              <li>Severe harassment, hate speech, threats of physical harm, or doxxing.</li>
              <li>Automated bots, spam scripts, or malicious screen broadcasts.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#F2F2F0]">4. Moderation, Reporting & Account Termination</h2>
            <p>
              We implement automated toxicity analysis and user-driven reporting workflows. Reports with opt-in encrypted evidence snapshots are retained for up to 90 days solely for safety audits. Users accumulating 3 actioned strikes or committing single severe offenses are permanently blacklisted.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-[#F2F2F0]">5. Disclaimer of Warranties & Limitation of Liability</h2>
            <p>
              The platform is provided &quot;AS IS&quot; without warranties of any kind. To the fullest extent permitted by law, V-Chat operators disclaim all liability arising from user interactions or unauthorized conduct on the platform.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
