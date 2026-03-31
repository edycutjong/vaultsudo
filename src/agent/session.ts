/* ═══════════════════════════════════════════════════════════
   VaultSudo — Session Management (In-Memory Store)
   Manages agent sessions and sudo session state.
   Replaceable with Supabase for production.
   ═══════════════════════════════════════════════════════════ */

import type {
  AgentSession,
  AgentMessage,
  SudoSession,
  PendingAction,
  AuditLogEntry,
} from "@/lib/types";

/** In-memory session store */
const sessions = new Map<string, AgentSession>();
const auditLog: AuditLogEntry[] = [];

/** Generate a unique ID */
function generateId(prefix: string = "sess"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create or retrieve an agent session */
export function getOrCreateSession(
  sessionId?: string,
  userId: string = "demo-user"
): AgentSession {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  const id = sessionId || generateId("sess");
  const session: AgentSession = {
    id,
    user_id: userId,
    status: "active",
    ciba_request_id: null,
    pending_action: null,
    sudo_session: null,
    messages: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  sessions.set(id, session);
  return session;
}

/** Update session status */
export function updateSessionStatus(
  sessionId: string,
  status: AgentSession["status"]
): AgentSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = status;
  session.updated_at = new Date().toISOString();
  return session;
}

/** Set a pending action on a session (paused awaiting auth) */
export function setPendingAction(
  sessionId: string,
  action: PendingAction
): AgentSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = "paused_awaiting_auth";
  session.pending_action = action;
  session.updated_at = new Date().toISOString();
  return session;
}

/** Clear pending action and resume session */
export function clearPendingAction(
  sessionId: string
): AgentSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = "active";
  session.pending_action = null;
  session.updated_at = new Date().toISOString();
  return session;
}

/** Set a Sudo Session on the agent session */
export function setSudoSession(
  sessionId: string,
  sudoSession: SudoSession
): AgentSession | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.sudo_session = sudoSession;
  session.updated_at = new Date().toISOString();
  return session;
}

/** Clear expired Sudo Session */
export function clearExpiredSudoSession(
  sessionId: string
): boolean {
  const session = sessions.get(sessionId);
  if (!session || !session.sudo_session) return false;

  if (new Date(session.sudo_session.expires_at) < new Date()) {
    session.sudo_session = null;
    session.updated_at = new Date().toISOString();
    return true;
  }

  return false;
}

/** Add a message to a session */
export function addMessage(
  sessionId: string,
  message: Omit<AgentMessage, "id" | "timestamp">
): AgentMessage | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const msg: AgentMessage = {
    ...message,
    id: generateId("msg"),
    timestamp: new Date().toISOString(),
  };

  session.messages.push(msg);
  session.updated_at = new Date().toISOString();
  return msg;
}

/** Add an audit log entry */
export function addAuditEntry(
  entry: Omit<AuditLogEntry, "id" | "created_at">
): AuditLogEntry {
  const log: AuditLogEntry = {
    ...entry,
    id: generateId("audit"),
    created_at: new Date().toISOString(),
  };

  auditLog.unshift(log); // Newest first
  return log;
}

/** Get the audit trail */
export function getAuditTrail(limit: number = 50): AuditLogEntry[] {
  return auditLog.slice(0, limit);
}

/** Get a session by ID */
export function getSession(sessionId: string): AgentSession | null {
  return sessions.get(sessionId) || null;
}

/** Get all sessions */
export function getAllSessions(): AgentSession[] {
  return Array.from(sessions.values());
}
