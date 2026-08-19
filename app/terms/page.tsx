"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-text flex flex-col">
      <Navbar user={null} />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to V-Chat
        </Link>

        {/* Legal Disclaimer Alert */}
        <div className="p-4 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold mb-1">
              DRAFT DOCUMENT — REQUIRES FORMAL LEGAL COUNSEL REVIEW
            </strong>
            <span>
              This document is a technical and operational policy template created for development purposes. Before launching V-Chat for public production use, these Terms of Service must be formally reviewed and certified by qualified legal counsel in your operating jurisdictions.
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
          Terms of Service (Draft)
        </h1>
        <p className="text-xs text-text-muted mb-8 font-mono">
          Last Updated: August 2026 • Version 1.0-draft
        </p>

        <div className="space-y-6 text-xs sm:text-sm text-text-muted leading-relaxed">
          <section className="bg-surface border border-surface-border p-5 rounded">
            <h2 className="text-base font-bold text-text mb-2">
              1. Minimum Age Requirement (Strict 18+)
            </h2>
            <p>
              V-Chat is exclusively intended for individuals who are at least eighteen (18) years of age. Access by minors is strictly prohibited. By accessing or using the service, you represent and warrant that you are 18 years of age or older. We maintain zero tolerance for underage access and will immediately suspend offending accounts and preserve records where legally mandated.
            </p>
          </section>

          <section className="bg-surface border border-surface-border p-5 rounded">
            <h2 className="text-base font-bold text-text mb-2">
              2. Prohibited Conduct & Content
            </h2>
            <p className="mb-2">Users agree not to broadcast, transmit, or promote:</p>
            <ul className="list-disc pl-5 space-y-1 text-text">
              <li>Any form of child sexual abuse material (CSAM) or minor endangerment.</li>
              <li>Non-consensual nudity, sexual acts, or unsolicited sexual harassment.</li>
              <li>Hate speech, threats of violence, intimidation, or harassment.</li>
              <li>Automated bots, malicious scripts, spam, or commercial advertisements.</li>
            </ul>
          </section>

          <section className="bg-surface border border-surface-border p-5 rounded">
            <h2 className="text-base font-bold text-text mb-2">
              3. Ephemeral Media & Data Privacy
            </h2>
            <p>
              V-Chat connects peers using end-to-end direct WebRTC data and media streams. Video and audio streams are not permanently recorded or stored on our servers. Text chat logs are purely ephemeral and automatically deleted within 24 hours. Reports containing optional evidence snapshots are stored in encrypted, restricted access buckets strictly for safety audits.
            </p>
          </section>

          <section className="bg-surface border border-surface-border p-5 rounded">
            <h2 className="text-base font-bold text-text mb-2">
              4. Termination & Law Enforcement Cooperation
            </h2>
            <p>
              We reserve the right to suspend or ban any user, IP address, or device identifier violating these terms at our sole discretion. We cooperate fully with law enforcement authorities and reporting entities (such as NCMEC) regarding severe violations or child safety risks.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
