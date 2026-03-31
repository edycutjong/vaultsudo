/* ═══════════════════════════════════════════════════════════
   VaultSudo — Core Type Definitions
   ═══════════════════════════════════════════════════════════ */

/** Scope classification for agent tools */
export type ToolScope = "read" | "write";

/** Status of an agent action */
export type ActionStatus =
  | "allowed"
  | "blocked"
  | "pending"
  | "approved"
  | "denied";

/** Status of an agent session */
export type SessionStatus =
  | "active"
  | "paused_awaiting_auth"
  | "completed"
  | "failed";

/** Approval method used by human */
export type ApprovalMethod = "webauthn" | "mfa_push" | "manual" | null;

/** A single entry in the immutable audit trail */
export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  scope: ToolScope;
  status: ActionStatus;
  resource: string | null;
  agent_reasoning: string | null;
  action_intent_hash: string | null;
  token_ttl_seconds: number | null;
  approval_method: ApprovalMethod;
  created_at: string;
}

/** An active Sudo Session granting time-bound write access */
export interface SudoSession {
  id: string;
  scope_pattern: string; // e.g., "repos/*/contents"
  granted_at: string;
  expires_at: string;
  approved_actions: string[]; // List of action types approved
  ttl_seconds: number;
}

/** The pending action waiting for human approval */
export interface PendingAction {
  action_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  action_intent: string; // Human-readable description
  required_scope: string;
  created_at: string;
}

/** An agent session with state management */
export interface AgentSession {
  id: string;
  user_id: string;
  status: SessionStatus;
  ciba_request_id: string | null;
  pending_action: PendingAction | null;
  sudo_session: SudoSession | null;
  messages: AgentMessage[];
  created_at: string;
  updated_at: string;
}

/** Types of messages in the agent terminal */
export type MessageType =
  | "user"
  | "agent"
  | "system"
  | "tool_call"
  | "tool_result"
  | "security_alert"
  | "approval_request"
  | "approval_response";

/** A message in the agent terminal */
export interface AgentMessage {
  id: string;
  type: MessageType;
  content: string;
  scope?: ToolScope;
  status?: ActionStatus;
  tool_name?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/** Tool definition with VaultSudo scope metadata */
export interface VaultSudoTool {
  name: string;
  description: string;
  scope: ToolScope;
  required_scope?: string; // Specific scope pattern for write tools
  parameters: Record<string, unknown>;
}

/** Result of VaultSudo gate evaluation */
export interface GateResult {
  allowed: boolean;
  status: ActionStatus;
  action_id?: string;
  action_intent?: string;
  required_scope?: string;
  sudo_session?: SudoSession;
  message: string;
}

/** State sent to frontend via SSE */
export interface DashboardState {
  session: AgentSession;
  audit_log: AuditLogEntry[];
  active_scopes: {
    read: string[];
    write: string[];
  };
}
