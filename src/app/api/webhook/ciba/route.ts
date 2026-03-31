/* ═══════════════════════════════════════════════════════════
   VaultSudo — CIBA Webhook Callback
   Simulates Auth0 CIBA approval/denial notification.
   In production, this receives the Auth0 CIBA callback.
   ═══════════════════════════════════════════════════════════ */

import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateSession,
  clearPendingAction,
  setSudoSession,
  addMessage,
  addAuditEntry,
} from "@/agent/session";
import { createSudoSession, createAuditEntry } from "@/agent/vault-sudo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action_id, approved, scope_pattern, ttl_seconds } = body;

    const session = getOrCreateSession(sessionId);

    if (!session.pending_action) {
      return NextResponse.json(
        { error: "No pending action found for this session" },
        { status: 400 }
      );
    }

    if (session.pending_action.action_id !== action_id) {
      return NextResponse.json(
        { error: "Action ID mismatch" },
        { status: 400 }
      );
    }

    const pendingAction = session.pending_action;

    if (approved) {
      // Create Sudo Session
      const sudoSession = createSudoSession(
        scope_pattern || pendingAction.required_scope,
        ttl_seconds || 600,
        [pendingAction.tool_name]
      );
      setSudoSession(sessionId, sudoSession);

      // Clear pending action
      clearPendingAction(sessionId);

      // Add approval message
      addMessage(sessionId, {
        type: "approval_response",
        content:
          `✅ **Action Approved**\n\n` +
          `Human operator approved the action via step-up authentication.\n\n` +
          `**Sudo Session Granted:**\n` +
          `• Scope: \`${sudoSession.scope_pattern}\`\n` +
          `• TTL: ${sudoSession.ttl_seconds}s\n` +
          `• Expires: ${new Date(sudoSession.expires_at).toLocaleTimeString()}\n\n` +
          `The agent may now proceed with the approved action.`,
        scope: "write",
        status: "approved",
      });

      // Audit entry
      addAuditEntry({
        user_id: session.user_id,
        action: pendingAction.tool_name,
        scope: "write",
        status: "approved",
        resource: null,
        agent_reasoning: null,
        action_intent_hash: null,
        token_ttl_seconds: sudoSession.ttl_seconds,
        approval_method: "manual",
      });

      return NextResponse.json({
        status: "approved",
        sudo_session: sudoSession,
        message: "Action approved. Sudo session created.",
      });
    } else {
      // Denial
      clearPendingAction(sessionId);

      addMessage(sessionId, {
        type: "approval_response",
        content:
          `❌ **Action Denied**\n\n` +
          `Human operator denied the action.\n\n` +
          `**Denied Action:** ${pendingAction.action_intent}\n\n` +
          `The agent will not proceed with this action.`,
        scope: "write",
        status: "denied",
      });

      addAuditEntry({
        user_id: session.user_id,
        action: pendingAction.tool_name,
        scope: "write",
        status: "denied",
        resource: null,
        agent_reasoning: null,
        action_intent_hash: null,
        token_ttl_seconds: null,
        approval_method: null,
      });

      return NextResponse.json({
        status: "denied",
        message: "Action denied by human operator.",
      });
    }
  } catch (error) {
    console.error("CIBA webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
