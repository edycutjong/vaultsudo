/* ═══════════════════════════════════════════════════════════
   VaultSudo — Core Middleware (The Heart)
   Intercepts every tool call, classifies scope, and gates
   write actions behind human approval.
   ═══════════════════════════════════════════════════════════ */

import type {
  ToolScope,
  GateResult,
  SudoSession,
  AuditLogEntry,
} from "@/lib/types";

/** Tool name → scope classification */
const TOOL_SCOPE_MAP: Record<string, ToolScope> = {
  // Read tools (no friction)
  read_commits: "read",
  read_pull_requests: "read",
  read_ci_status: "read",
  read_issues: "read",
  read_repo_info: "read",

  // Write tools (gated)
  revert_commit: "write",
  merge_pull_request: "write",
  close_issue: "write",
  create_comment: "write",
  delete_branch: "write",
  delete_repo: "write",
};

/** Scope patterns for write tools */
const TOOL_SCOPE_PATTERNS: Record<string, string> = {
  revert_commit: "repos/*/git/refs",
  merge_pull_request: "repos/*/pulls/*/merge",
  close_issue: "repos/*/issues/*",
  create_comment: "repos/*/issues/*/comments",
  delete_branch: "repos/*/git/refs/*",
  delete_repo: "repos/*",
};

/** Classify a tool call as 'read' or 'write' */
export function classifyScope(toolName: string): ToolScope {
  return TOOL_SCOPE_MAP[toolName] || "write"; // Default to write for unknown tools
}

/** Generate a unique action ID */
function generateActionId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Format an Action Intent Diff (human-readable) */
export function formatActionIntent(
  toolName: string,
  args: Record<string, unknown>
): string {
  const method = toolName.startsWith("read_") ? "GET" : getHttpMethod(toolName);
  const resource = formatResource(toolName, args);
  const severity = classifyScope(toolName) === "write" ? "⚠️" : "✅";

  return `${severity} Agent attempting: ${method} ${resource}`;
}

function getHttpMethod(toolName: string): string {
  if (toolName.startsWith("delete_")) return "DELETE";
  if (toolName.startsWith("close_")) return "PATCH";
  if (toolName.startsWith("merge_")) return "PUT";
  if (toolName.startsWith("revert_")) return "POST";
  if (toolName.startsWith("create_")) return "POST";
  return "POST";
}

function formatResource(
  toolName: string,
  args: Record<string, unknown>
): string {
  const owner = (args.owner as string) || "{owner}";
  const repo = (args.repo as string) || "{repo}";
  
  switch (toolName) {
    case "read_commits":
      return `/repos/${owner}/${repo}/commits`;
    case "read_pull_requests":
      return `/repos/${owner}/${repo}/pulls`;
    case "read_ci_status":
      return `/repos/${owner}/${repo}/actions/runs`;
    case "read_issues":
      return `/repos/${owner}/${repo}/issues`;
    case "revert_commit":
      return `/repos/${owner}/${repo}/git/refs (revert ${args.commit_sha || "..."})`;
    case "merge_pull_request":
      return `/repos/${owner}/${repo}/pulls/${args.pull_number || "..."}/merge`;
    case "close_issue":
      return `/repos/${owner}/${repo}/issues/${args.issue_number || "..."}`;
    case "create_comment":
      return `/repos/${owner}/${repo}/issues/${args.issue_number || "..."}/comments`;
    case "delete_branch":
      return `/repos/${owner}/${repo}/git/refs/heads/${args.branch || "..."}`;
    case "delete_repo":
      return `/repos/${owner}/${repo}`;
    default:
      return `/repos/${owner}/${repo}/${toolName}`;
  }
}

/** Check if a Sudo Session covers the required scope */
function sessionCoversScope(
  session: SudoSession,
  requiredScope: string
): boolean {
  // Check expiry
  if (new Date(session.expires_at) < new Date()) return false;

  // Simple glob match: "repos/*/contents" covers "repos/owner/repo/contents"
  const pattern = session.scope_pattern;
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, "[^/]+") + "$"
  );

  return regex.test(requiredScope);
}

/**
 * The VaultSudo Gate — evaluates every tool call.
 *
 * Returns:
 * - { allowed: true } for read tools
 * - { allowed: true } for write tools covered by active Sudo Session
 * - { allowed: false, status: "pending" } for write tools needing approval
 * - { allowed: false, status: "blocked" } for dangerous actions outside session scope
 */
export function vaultSudoGate(
  toolName: string,
  args: Record<string, unknown>,
  activeSudoSession: SudoSession | null
): GateResult {
  const scope = classifyScope(toolName);

  // READ: always allowed
  if (scope === "read") {
    return {
      allowed: true,
      status: "allowed",
      message: `✅ Read action permitted: ${toolName}`,
    };
  }

  // [M-01 FIX] DANGEROUS: block unconditionally BEFORE any session check.
  // This ensures no SudoSession — regardless of scope pattern — can ever
  // authorize a destructive action. Defense-in-depth, order-independent.
  const DANGEROUS_ACTIONS = ["delete_repo", "force_push", "delete_branch"];
  if (DANGEROUS_ACTIONS.includes(toolName)) {
    return {
      allowed: false,
      status: "blocked",
      action_id: generateActionId(),
      action_intent: formatActionIntent(toolName, args),
      required_scope: TOOL_SCOPE_PATTERNS[toolName] || "__blocked__/dangerous",
      message: `🚫 BLOCKED: ${toolName} is classified as a dangerous action and cannot be authorized by any Sudo Session`,
    };
  }

  // [L-01 FIX] Use a never-matching pattern for unknown tools instead of
  // a predictable `repos/*/toolName` that could match a broad SudoSession.
  const requiredScope =
    TOOL_SCOPE_PATTERNS[toolName] || "__blocked__/unknown";

  // WRITE: check Sudo Session
  if (
    activeSudoSession &&
    sessionCoversScope(activeSudoSession, requiredScope)
  ) {
    // [A-01 FIX] Enforce allowed_actions for fine-grained tool-level control.
    // If allowed_actions is populated, the specific tool must be listed.
    if (
      activeSudoSession.approved_actions &&
      activeSudoSession.approved_actions.length > 0 &&
      !activeSudoSession.approved_actions.includes(toolName)
    ) {
      return {
        allowed: false,
        status: "pending",
        action_id: generateActionId(),
        action_intent: formatActionIntent(toolName, args),
        required_scope: requiredScope,
        message: `⏳ Write action '${toolName}' is not in the Sudo Session's allowed_actions list — requires separate approval`,
      };
    }

    return {
      allowed: true,
      status: "approved",
      sudo_session: activeSudoSession,
      message: `🔓 Write action covered by active Sudo Session: ${toolName}`,
    };
  }

  // Standard write: request human approval
  return {
    allowed: false,
    status: "pending",
    action_id: generateActionId(),
    action_intent: formatActionIntent(toolName, args),
    required_scope: requiredScope,
    message: `⏳ Write action requires human approval: ${toolName}`,
  };
}

/** Create a new Sudo Session */
export function createSudoSession(
  scopePattern: string,
  ttlSeconds: number = 600, // 10 minutes default
  approvedActions: string[] = []
): SudoSession {
  const now = new Date();
  const expires = new Date(now.getTime() + ttlSeconds * 1000);

  return {
    id: `sudo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    scope_pattern: scopePattern,
    granted_at: now.toISOString(),
    expires_at: expires.toISOString(),
    approved_actions: approvedActions,
    ttl_seconds: ttlSeconds,
  };
}

/** Create an audit log entry */
export function createAuditEntry(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  gateResult: GateResult,
  agentReasoning?: string
): Omit<AuditLogEntry, "id" | "created_at"> {
  const owner = (args.owner as string) || "";
  const repo = (args.repo as string) || "";

  return {
    user_id: userId,
    action: toolName,
    scope: classifyScope(toolName),
    status: gateResult.status,
    resource: owner && repo ? `${owner}/${repo}` : null,
    agent_reasoning: agentReasoning || null,
    action_intent_hash: gateResult.action_intent
      ? Buffer.from(gateResult.action_intent, "utf-8")
          .toString("base64")
          .slice(0, 32)
      : null,
    token_ttl_seconds: gateResult.sudo_session?.ttl_seconds || null,
    approval_method: gateResult.status === "approved" ? "manual" : null,
  };
}
