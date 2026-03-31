/* ═══════════════════════════════════════════════════════════
   VaultSudo — Audit Log API Route
   Returns the immutable audit trail.
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import { getAuditTrail } from "@/agent/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  const trail = getAuditTrail(limit);

  return NextResponse.json({
    entries: trail,
    total: trail.length,
  });
}
