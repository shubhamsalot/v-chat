import { NextRequest, NextResponse } from "next/server";
import { matchmakingStore } from "@/lib/matchmaking/store";
import { ReportDoc, ReportReason } from "@/lib/types";

const VALID_REASONS: ReportReason[] = [
  "nudity",
  "harassment",
  "minor_concern",
  "spam",
  "other",
];

export async function POST(req: NextRequest) {
  try {
    const { reporterUid, reportedUid, matchId, reason, evidenceFrameUrl } = await req.json();

    if (!reporterUid || !reportedUid || !matchId || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid report reason" }, { status: 400 });
    }

    const report: ReportDoc = {
      reportId: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reporterUid,
      reportedUid,
      matchId,
      reason,
      evidenceFrameUrl: evidenceFrameUrl || undefined,
      createdAt: Date.now(),
      reviewStatus: "pending",
    };

    matchmakingStore.createReport(report);

    return NextResponse.json({ success: true, reportId: report.reportId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
