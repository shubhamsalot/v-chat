"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function CommunityGuidelinesPage() {
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
              DRAFT GUIDELINES — REQUIRES FORMAL LEGAL & POLICY REVIEW
            </strong>
            <span>
              These community guidelines represent the baseline safety and moderation policies for V-Chat and must be audited by your legal and trust & safety teams prior to commercial deployment.
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-display font-bold tracking-tight mb-2">
          Community Safety Guidelines (Draft)
        </h1>
        <p className="text-xs text-text-muted mb-8 font-mono">
          Last Updated: August 2026 • Version 1.0-draft
        </p>

        <div className="space-y-6 text-xs sm:text-sm text-text-muted leading-relaxed">
          <section className="bg-surface border border-surface-border p-5 rounded">
            <h2 className="text-base font-bold text-accent mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              1. Zero-Tolerance Rules (Immediate Permanent Ban)
            </h2>
            <div className="space-y-2 mt-3 text-text">
              <div className="p-3 bg-danger/10 border border-danger/20 rounded">
                <strong>Child Sexual Exploitation and Abuse:</strong> Any suspected minor presence or exploitation is immediately blocked, reported to NCMEC, and forwarded to law enforcement.
              </div>
              <div className="p-3 bg-danger/10 border border-danger/20 rounded">
                <strong>Non-Consensual Sexual Imagery & Acts:</strong> Streaming sexual acts or non-consensual nudity triggers instant account termination.
              </div>
              <div className="p-3 bg-danger/10 border border-danger/20 rounded">
                <strong>Severe Threats & Violent Extremism:</strong> Direct threats of harm or terrorism.
              </div>
            </div>
          </section>

          <section className="bg-surface border border-surface-border p-5 rounded">
            <h2 className="text-base font-bold text-text mb-2">
              2. Strike Policy & Automated Moderation
            </h2>
            <p className="mb-3">
              V-Chat utilizes Google Perspective API for real-time text toxicity scoring and player reporting systems.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>1st Strike:</strong> Automated warning & 24h queue cooldown.</li>
              <li><strong>2nd Strike:</strong> 7-day temporary suspension.</li>
              <li><strong>3rd Strike (or Severe Violation):</strong> Permanent hardware and account ban.</li>
            </ul>
          </section>

          <section className="bg-surface border border-surface-border p-5 rounded">
            <h2 className="text-base font-bold text-text mb-2">
              3. How Reporting Works
            </h2>
            <p>
              If a stranger violates these guidelines, click the <strong>Report</strong> flag icon in your control bar immediately. Selecting a reason will instantly terminate the video call, block that user from ever being matched with you again, and flag the account for immediate review.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
