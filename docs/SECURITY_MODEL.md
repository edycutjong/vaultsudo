# 🔒 VaultSudo — Security Model

> Defense-in-depth architecture for gating AI agent write actions.

---

## Threat Model

### Primary Threat: Over-Privileged AI Agents

AI coding agents (e.g., GitHub Copilot, Cursor, custom LangChain agents) are given permanent API keys with broad permissions. If an agent is compromised — via prompt injection, hallucination, or adversarial input — it can execute destructive operations before any human can intervene.

### Attack Vectors VaultSudo Defends Against

| Vector | Description | Defense Layer |
|--------|-------------|---------------|
| **Prompt Injection** | Malicious user input tricks the agent into running destructive commands | Dangerous Action Blocklist + Scope Classification |
| **Indirect Prompt Injection** | Poisoned data sources (issues, PRs, docs) embed hidden instructions | Dangerous Action Blocklist (unconditional) |
| **Privilege Escalation** | Agent attempts tools outside its granted scope | Sudo Session scope pattern matching |
| **Session Hijacking** | Attacker tries to use an existing Sudo Session for unauthorized tools | `approved_actions` list enforcement |
| **Temporal Abuse** | Using a Sudo Session long after approval context has changed | TTL expiry (default 10min, recommended 5min) |
| **Unknown Tool Injection** | Agent invents or hallucinates tool names to bypass restrictions | Unknown tools → `"write"` scope + `__blocked__/unknown` pattern |

---

## Security Layers

### Layer 1: Scope Classification (Fail-Closed)

Every tool call enters the VaultSudo gate and is classified:

```typescript
const TOOL_SCOPE_MAP: Record<string, ToolScope> = {
  read_commits: "read",
  read_ci_status: "read",
  revert_commit: "write",
  delete_repo: "write",
  // ...
};

// Unknown tools → default to "write" (fail-closed)
export function classifyScope(toolName: string): ToolScope {
  return TOOL_SCOPE_MAP[toolName] || "write";
}
```

**Why fail-closed?** If an LLM hallucinates a new tool name (e.g., `drop_database`), it will be treated as a write operation and require human approval. This prevents privilege escalation through tool invention.

### Layer 2: Dangerous Action Blocklist (Unconditional)

Certain actions are **never** allowed, regardless of Sudo Session state:

```typescript
const DANGEROUS_ACTIONS = ["delete_repo", "force_push", "delete_branch"];

// Checked BEFORE session validation — order-independent defense
if (DANGEROUS_ACTIONS.includes(toolName)) {
  return { allowed: false, status: "blocked" };
}
```

**Key property:** This check happens **before** any Sudo Session evaluation. Even if a Sudo Session has a wildcard scope pattern (`repos/**`), `delete_repo` is still blocked. This is the M-01 security fix referenced in the codebase.

### Layer 3: Sudo Session Validation

For non-dangerous write actions, VaultSudo checks for an active Sudo Session:

```
┌────────────────────────────────────────┐
│           Sudo Session Check           │
│                                        │
│  1. Does a session exist?              │
│     └── No → status: "pending"         │
│                                        │
│  2. Is the session expired?            │
│     └── Yes → status: "pending"        │
│                                        │
│  3. Does scope pattern match?          │
│     └── No → status: "pending"         │
│                                        │
│  4. Is tool in approved_actions?       │
│     └── No → status: "pending"         │
│                                        │
│  5. All checks pass                    │
│     └── status: "approved" ✅          │
└────────────────────────────────────────┘
```

**Scope Matching:** Uses glob-style patterns:
- `repos/*/git/refs` matches `repos/acme-corp/api-gateway/git/refs`
- `repos/*/pulls/*/merge` matches `repos/acme-corp/api-gateway/pulls/42/merge`
- Unknown tools use `__blocked__/unknown` — designed to never match any session

**Approved Actions:** Even if scope matches, the specific tool must be listed in `approved_actions[]`. A session granted for `revert_commit` cannot be used for `merge_pull_request`.

### Layer 4: Immutable Audit Trail

Every gate evaluation — whether allowed, blocked, or pending — is recorded:

```typescript
interface AuditLogEntry {
  user_id: string;
  action: string;           // Tool name
  scope: ToolScope;         // "read" | "write"
  status: ActionStatus;     // "allowed" | "pending" | "approved" | "denied" | "blocked"
  resource: string | null;  // "acme-corp/api-gateway"
  agent_reasoning: string;  // Why the agent wanted this action
  action_intent_hash: string; // Base64 hash of the action intent
  token_ttl_seconds: number;  // Sudo Session TTL (if approved)
  approval_method: string;    // "manual" | null
}
```

**Tamper detection:** Each entry includes an `action_intent_hash` — a base64 encoding of the full action intent string. This creates a verifiable chain of agent actions for compliance auditing.

---

## Sudo Session Properties

| Property | Value | Purpose |
|----------|-------|---------|
| `id` | `sudo_{timestamp}_{random}` | Unique identifier |
| `scope_pattern` | `repos/*/git/refs` | URI-like glob defining allowed resource scope |
| `granted_at` | ISO 8601 timestamp | When the session was minted |
| `expires_at` | ISO 8601 timestamp | Hard expiry (not renewable) |
| `approved_actions` | `["revert_commit"]` | Specific tools allowed within this session |
| `ttl_seconds` | `600` (10 min default) | Time-to-live in seconds |

### Session Lifecycle

```
Created (CIBA Approval)
    │
    ▼
Active ──── Tool calls validated against scope + actions
    │
    ├── TTL expires → Session invalidated (no renewal)
    │
    └── Manual revocation → Session cleared from memory
```

---

## CIBA (Client Initiated Backchannel Authentication)

VaultSudo uses Auth0 CIBA for out-of-band human approval:

```
Agent wants to write
        │
        ▼
VaultSudo blocks → "pending"
        │
        ▼
Push notification to human's device
        │
        ├── Shows Action Intent Diff
        │   "⚠️ Agent attempting: POST /repos/acme-corp/api-gateway/git/refs (revert mno7890)"
        │
        ├── Human reviews and decides
        │
        ▼
/api/webhook/ciba receives callback
        │
        ├── approved=true → createSudoSession()
        └── approved=false → clearPendingAction()
```

**Why CIBA over inline prompts?**
- The human doesn't need to be looking at the dashboard
- Works with mobile push notifications
- Decouples approval from the agent's execution context
- Prevents social engineering within the chat interface

---

## Mock Mode Security

In mock mode (`NEXT_PUBLIC_USE_MOCK=true`):
- All security logic is **fully operational** — the same `vaultSudoGate()` runs
- LLM responses are simulated, but the gate evaluation is real
- Sessions are stored in-memory (resets on server restart)
- No external API keys or Auth0 configuration needed

This means the demo is a **faithful representation** of the security model, not a simplified version.

---

## Production Roadmap

| Enhancement | Description |
|-------------|-------------|
| **Supabase Audit Trail** | Move from in-memory to PostgreSQL with RLS policies. Immutable rows, service_role key for writes only. |
| **Auth0 CIBA Integration** | Replace mock approval buttons with real push notifications via Auth0's CIBA flow. |
| **Rate Limiting** | Limit Sudo Session creation frequency per user. |
| **Scope Narrowing** | Automatically narrow scope patterns based on the specific resources in the action intent. |
| **Session Revocation API** | Allow humans to revoke active Sudo Sessions before TTL expiry. |
| **Wildcard Containment** | Prevent sessions with overly broad scope patterns (e.g., `*` or `**/*`). |

---

## Compliance Mapping

| Standard | VaultSudo Feature |
|----------|------------------|
| **SOC 2 (CC6.1)** | Immutable audit trail with action intent hashes |
| **SOC 2 (CC6.3)** | Scope-bound, time-limited authorization tokens |
| **ISO 27001 (A.9.2)** | Least privilege via read/write scope classification |
| **OWASP AI Security** | Prompt injection defense via dangerous action blocklist |
| **NIST AI RMF** | Human-in-the-loop approval for consequential actions |
