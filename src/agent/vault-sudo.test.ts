/* ═══════════════════════════════════════════════════════════
   VaultSudo Gate — Security Test Suite
   Validates all audit findings and defense-in-depth fixes.
   ═══════════════════════════════════════════════════════════ */

import { describe, it, expect } from "vitest";
import {
  vaultSudoGate,
  classifyScope,
  createSudoSession,
  formatActionIntent,
  createAuditEntry,
} from "./vault-sudo";
import type { SudoSession } from "@/lib/types";

// ─── Helpers ────────────────────────────────────────────────
function makeSession(
  overrides: Partial<SudoSession> = {}
): SudoSession {
  return createSudoSession(
    overrides.scope_pattern ?? "repos/*/git/refs",
    overrides.ttl_seconds ?? 600,
    overrides.approved_actions ?? ["revert_commit"]
  );
}

function expiredSession(
  overrides: Partial<SudoSession> = {}
): SudoSession {
  const s = makeSession(overrides);
  s.expires_at = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
  return s;
}

const READ_ARGS = { owner: "acme", repo: "api" };
const WRITE_ARGS = { owner: "acme", repo: "api", commit_sha: "abc123" };
const DELETE_ARGS = { owner: "acme", repo: "api", confirm: true };

// ═══════════════════════════════════════════════════════════
// 1. SCOPE CLASSIFICATION
// ═══════════════════════════════════════════════════════════
describe("classifyScope", () => {
  it("classifies known read tools as 'read'", () => {
    expect(classifyScope("read_commits")).toBe("read");
    expect(classifyScope("read_pull_requests")).toBe("read");
    expect(classifyScope("read_ci_status")).toBe("read");
    expect(classifyScope("read_issues")).toBe("read");
    expect(classifyScope("read_repo_info")).toBe("read");
  });

  it("classifies known write tools as 'write'", () => {
    expect(classifyScope("revert_commit")).toBe("write");
    expect(classifyScope("merge_pull_request")).toBe("write");
    expect(classifyScope("close_issue")).toBe("write");
    expect(classifyScope("delete_repo")).toBe("write");
  });

  it("[L-01] defaults unknown tools to 'write' (deny-by-default)", () => {
    expect(classifyScope("unknown_tool")).toBe("write");
    expect(classifyScope("")).toBe("write");
    expect(classifyScope("exploit_tool")).toBe("write");
  });
});

// ═══════════════════════════════════════════════════════════
// 2. READ TOOLS — ALWAYS ALLOWED
// ═══════════════════════════════════════════════════════════
describe("vaultSudoGate — read tools", () => {
  it("allows read tools without a session", () => {
    const result = vaultSudoGate("read_commits", READ_ARGS, null);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("allowed");
  });

  it("allows read tools even with an expired session", () => {
    const result = vaultSudoGate("read_ci_status", READ_ARGS, expiredSession());
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("allowed");
  });
});

// ═══════════════════════════════════════════════════════════
// 3. WRITE TOOLS — GATED BY SUDO SESSION
// ═══════════════════════════════════════════════════════════
describe("vaultSudoGate — write tools", () => {
  it("blocks write tools without a session (pending)", () => {
    const result = vaultSudoGate("revert_commit", WRITE_ARGS, null);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("pending");
    expect(result.action_id).toBeTruthy();
    expect(result.action_intent).toBeTruthy();
    expect(result.required_scope).toBeTruthy();
  });

  it("allows write tools with a valid, scoped session", () => {
    const session = makeSession({
      scope_pattern: "repos/*/git/refs",
      approved_actions: ["revert_commit"],
    });
    const result = vaultSudoGate("revert_commit", WRITE_ARGS, session);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("approved");
    expect(result.sudo_session).toBeDefined();
  });

  it("blocks write tools when session scope doesn't match", () => {
    const session = makeSession({
      scope_pattern: "repos/*/issues/*",
      approved_actions: ["revert_commit"],
    });
    const result = vaultSudoGate("revert_commit", WRITE_ARGS, session);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("pending");
  });

  it("blocks write tools when session is expired", () => {
    const result = vaultSudoGate("revert_commit", WRITE_ARGS, expiredSession());
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("pending");
  });
});

// ═══════════════════════════════════════════════════════════
// 4. [M-01] DANGEROUS ACTIONS — UNCONDITIONAL BLOCK
// ═══════════════════════════════════════════════════════════
describe("vaultSudoGate — [M-01] dangerous action defense-in-depth", () => {
  it("blocks delete_repo even without a session", () => {
    const result = vaultSudoGate("delete_repo", DELETE_ARGS, null);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("blocked");
  });

  it("blocks delete_repo even with a broadly-scoped session", () => {
    // This is the key M-01 test: a session with repos/* scope
    // that WOULD match delete_repo's required scope
    const broadSession = makeSession({
      scope_pattern: "repos/*",
      approved_actions: ["delete_repo"],
    });
    const result = vaultSudoGate("delete_repo", DELETE_ARGS, broadSession);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("blocked");
  });

  it("blocks force_push unconditionally", () => {
    const session = makeSession({
      scope_pattern: "repos/*/git/refs",
      approved_actions: ["force_push"],
    });
    const result = vaultSudoGate("force_push", WRITE_ARGS, session);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("blocked");
  });

  it("blocks delete_branch unconditionally", () => {
    const session = makeSession({
      scope_pattern: "repos/*/git/refs/*",
      approved_actions: ["delete_branch"],
    });
    const result = vaultSudoGate("delete_branch", { ...READ_ARGS, branch: "main" }, session);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("blocked");
  });
});

// ═══════════════════════════════════════════════════════════
// 5. [L-01] UNKNOWN TOOLS — NEVER-MATCHING SCOPE
// ═══════════════════════════════════════════════════════════
describe("vaultSudoGate — [L-01] unknown tool scope pattern", () => {
  it("unknown tools get '__blocked__/unknown' scope (never matches)", () => {
    const result = vaultSudoGate("exploit_tool", READ_ARGS, null);
    expect(result.allowed).toBe(false);
    expect(result.required_scope).toBe("__blocked__/unknown");
  });

  it("unknown tools cannot be covered by a broad session", () => {
    const broadSession = makeSession({
      scope_pattern: "repos/*",
      approved_actions: ["exploit_tool"],
    });
    const result = vaultSudoGate("exploit_tool", READ_ARGS, broadSession);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("pending");
  });
});

// ═══════════════════════════════════════════════════════════
// 6. [A-01] ALLOWED_ACTIONS ENFORCEMENT
// ═══════════════════════════════════════════════════════════
describe("vaultSudoGate — [A-01] allowed_actions enforcement", () => {
  it("blocks a tool covered by scope but NOT in allowed_actions", () => {
    // Session allows revert_commit but NOT merge_pull_request
    // Both share a scope pattern that could match
    const session = makeSession({
      scope_pattern: "repos/*/pulls/*/merge",
      approved_actions: ["revert_commit"], // does NOT include merge_pull_request
    });
    const result = vaultSudoGate("merge_pull_request", {
      owner: "acme",
      repo: "api",
      pull_number: 42,
    }, session);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("pending");
    expect(result.message).toContain("allowed_actions");
  });

  it("allows a tool that IS in allowed_actions with matching scope", () => {
    const session = makeSession({
      scope_pattern: "repos/*/git/refs",
      approved_actions: ["revert_commit"],
    });
    const result = vaultSudoGate("revert_commit", WRITE_ARGS, session);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("approved");
  });

  it("allows any tool when allowed_actions is empty (backward compat)", () => {
    const session = makeSession({
      scope_pattern: "repos/*/git/refs",
      approved_actions: [], // empty = no restriction
    });
    const result = vaultSudoGate("revert_commit", WRITE_ARGS, session);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("approved");
  });
});

// ═══════════════════════════════════════════════════════════
// 7. SUDO SESSION LIFECYCLE
// ═══════════════════════════════════════════════════════════
describe("createSudoSession", () => {
  it("creates a session with correct TTL", () => {
    const session = createSudoSession("repos/*/git/refs", 300, ["revert_commit"]);
    expect(session.id).toMatch(/^sudo_/);
    expect(session.scope_pattern).toBe("repos/*/git/refs");
    expect(session.ttl_seconds).toBe(300);
    expect(session.approved_actions).toEqual(["revert_commit"]);

    const expiresAt = new Date(session.expires_at).getTime();
    const grantedAt = new Date(session.granted_at).getTime();
    expect(expiresAt - grantedAt).toBeCloseTo(300_000, -2); // ~300s
  });

  it("defaults TTL to 600 seconds", () => {
    const session = createSudoSession("repos/*");
    expect(session.ttl_seconds).toBe(600);
  });
});

// ═══════════════════════════════════════════════════════════
// 8. ACTION INTENT FORMATTING
// ═══════════════════════════════════════════════════════════
  describe("formatActionIntent", () => {
    it("formats read actions with GET method", () => {
      const intent = formatActionIntent("read_commits", {
        owner: "acme",
        repo: "api",
      });
      expect(intent).toContain("GET /repos/acme/api/commits");
      expect(intent).toContain("✅");
    });

    it("formats read_issues, read_ci_status, and read_pull_requests", () => {
      expect(formatActionIntent("read_issues", { owner: "acme", repo: "api" })).toContain("GET /repos/acme/api/issues");
      expect(formatActionIntent("read_ci_status", { owner: "acme", repo: "api" })).toContain("GET /repos/acme/api/actions/runs");
      expect(formatActionIntent("read_pull_requests", { owner: "acme", repo: "api" })).toContain("GET /repos/acme/api/pulls");
    });

    it("formats write actions with correct HTTP method", () => {
      const intent = formatActionIntent("merge_pull_request", {
        owner: "acme",
        repo: "api",
        pull_number: 123,
      });
      expect(intent).toContain("PUT /repos/acme/api/pulls/123/merge");
      expect(intent).toContain("⚠️");
    });

    it("formats revert with POST method", () => {
      const intent = formatActionIntent("revert_commit", {
        owner: "acme",
        repo: "api",
        commit_sha: "abcdef",
      });
      expect(intent).toContain("POST /repos/acme/api/git/refs (revert abcdef)");
    });

    it("formats close_issue, create_comment, and default action with correct fallback", () => {
      expect(formatActionIntent("close_issue", { owner: "acme", repo: "api", issue_number: 456 }))
        .toContain("PATCH /repos/acme/api/issues/456");
      expect(formatActionIntent("create_comment", { owner: "acme", repo: "api", issue_number: 456 }))
        .toContain("POST /repos/acme/api/issues/456/comments");
      expect(formatActionIntent("unknown_tool", { owner: "acme", repo: "api" }))
        .toContain("POST /repos/acme/api/unknown_tool");
    });

    it("handles missing arguments safely with fallbacks", () => {
      expect(formatActionIntent("read_commits", {}))
        .toContain("GET /repos/{owner}/{repo}/commits");
      expect(formatActionIntent("revert_commit", {}))
        .toContain("POST /repos/{owner}/{repo}/git/refs (revert ...)");
      expect(formatActionIntent("merge_pull_request", {}))
        .toContain("PUT /repos/{owner}/{repo}/pulls/.../merge");
      expect(formatActionIntent("close_issue", {}))
        .toContain("PATCH /repos/{owner}/{repo}/issues/...");
      expect(formatActionIntent("create_comment", {}))
        .toContain("POST /repos/{owner}/{repo}/issues/.../comments");
      expect(formatActionIntent("delete_branch", {}))
        .toContain("DELETE /repos/{owner}/{repo}/git/refs/heads/...");
    });
  });

// ═══════════════════════════════════════════════════════════
// 9. AUDIT ENTRY CREATION
// ═══════════════════════════════════════════════════════════
describe("createAuditEntry", () => {
  it("creates an entry with all required fields", () => {
    const entry = createAuditEntry(
      "user123",
      "delete_repo",
      DELETE_ARGS,
      {
        allowed: false,
        status: "blocked",
        action_intent: formatActionIntent("delete_repo", DELETE_ARGS),
        message: "Blocked dangerous action",
      }
    );

    expect(entry.user_id).toBe("user123");
    expect(entry.action).toBe("delete_repo");
    expect(entry.scope).toBe("write");
    expect(entry.status).toBe("blocked");
    expect(entry.resource).toBe("acme/api");
    expect(entry.action_intent_hash).toBeDefined();
    expect(entry.approval_method).toBeNull();
  });

  it("handles missing string arguments and non-approved status", () => {
    const entry = createAuditEntry(
      "user123",
      "unknown_action",
      {}, // missing owner/repo
      {
        allowed: false,
        status: "pending",
        message: "Pending",
      }
    );

    expect(entry.resource).toBeNull();
    expect(entry.action_intent_hash).toBeNull();
    expect(entry.approval_method).toBeNull();
  });

  it("sets approval_method to manual when status is approved", () => {
    const entry = createAuditEntry("user-1", "merge_pull_request", {}, {
      status: "approved",
      allowed: true,
      message: "Approved action"
    });
    expect(entry.approval_method).toBe("manual");
  });

  it("includes agent reasoning when provided", () => {
    const gate = vaultSudoGate("revert_commit", WRITE_ARGS, null);
    const entry = createAuditEntry(
      "user-1",
      "revert_commit",
      WRITE_ARGS,
      gate,
      "CI was broken"
    );
    expect(entry.agent_reasoning).toBe("CI was broken");
  });

  it("generates action_intent_hash for write actions", () => {
    const gate = vaultSudoGate("revert_commit", WRITE_ARGS, null);
    const entry = createAuditEntry("user-1", "revert_commit", WRITE_ARGS, gate);
    expect(entry.action_intent_hash).toBeTruthy();
    expect(entry.action_intent_hash!.length).toBeGreaterThan(0);
  });
});
