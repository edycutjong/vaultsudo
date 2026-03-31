import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getOrCreateSession,
  updateSessionStatus,
  setPendingAction,
  clearPendingAction,
  setSudoSession,
  clearExpiredSudoSession,
  addMessage,
  addAuditEntry,
  getAuditTrail,
  getSession,
  getAllSessions,
} from "./session";
import type { PendingAction, SudoSession } from "@/lib/types";

describe("session store", () => {
  // Clear the module state before each test
  beforeEach(() => {
    // We can't actually clear the Map because it's not exported,
    // so we will just use unique IDs for each test to avoid collisions
  });

  it("getOrCreateSession creates a new session", () => {
    const session = getOrCreateSession(undefined, "user1");
    expect(session.id.startsWith("sess_")).toBe(true);
    expect(session.user_id).toBe("user1");
    expect(session.status).toBe("active");
  });

  it("getOrCreateSession returns existing session", () => {
    const session1 = getOrCreateSession("custom-1", "user1");
    const session2 = getOrCreateSession("custom-1", "user1");
    expect(session1).toBe(session2);
  });

  it("updateSessionStatus updates status and timestamp", () => {
    const session = getOrCreateSession("test-status");
    const oldTime = session.updated_at;
    
    // slight delay
    vi.useFakeTimers();
    vi.advanceTimersByTime(100);
    
    const updated = updateSessionStatus(session.id, "failed");
    expect(updated?.status).toBe("failed");
    expect(updated?.updated_at).not.toBe(oldTime);
    expect(updateSessionStatus("non-existent", "failed")).toBeNull();
    vi.useRealTimers();
  });

  it("setPendingAction updates session properly", () => {
    const session = getOrCreateSession("test-pending");
    const action: PendingAction = {
      action_id: "act_1",
      tool_name: "test_tool",
      tool_args: {},
      action_intent: "test intent",
      required_scope: "test/scope",
      created_at: new Date().toISOString(),
    };
    
    const updated = setPendingAction(session.id, action);
    expect(updated?.status).toBe("paused_awaiting_auth");
    expect(updated?.pending_action).toBe(action);
    expect(setPendingAction("non-existent", action)).toBeNull();
  });

  it("clearPendingAction clears pending action", () => {
    const session = getOrCreateSession("test-clear");
    const action: PendingAction = {
        action_id: "act_2",
        tool_name: "test_tool",
        tool_args: {},
        action_intent: "test intent",
        required_scope: "test/scope",
        created_at: new Date().toISOString(),
    };
    setPendingAction(session.id, action);
    const cleared = clearPendingAction(session.id);
    expect(cleared?.status).toBe("active");
    expect(cleared?.pending_action).toBeNull();
    expect(clearPendingAction("non-existent")).toBeNull();
  });

  it("setSudoSession updates sudo session", () => {
    const session = getOrCreateSession("test-sudo");
    const sudoSession: SudoSession = {
      id: "sudo_1",
      scope_pattern: "scope/*",
      granted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 1000).toISOString(),
      approved_actions: [],
      ttl_seconds: 600,
    };
    const updated = setSudoSession(session.id, sudoSession);
    expect(updated?.sudo_session).toBe(sudoSession);
    expect(setSudoSession("non-existent", sudoSession)).toBeNull();
  });

  it("clearExpiredSudoSession clears if expired", () => {
    vi.useFakeTimers();
    const now = new Date();
    vi.setSystemTime(now);

    const session = getOrCreateSession("test-expire");
    const sudoSession: SudoSession = {
      id: "sudo_2",
      scope_pattern: "scope/*",
      granted_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 1000).toISOString(),
      approved_actions: [],
      ttl_seconds: 1,
    };
    setSudoSession(session.id, sudoSession);
    
    expect(clearExpiredSudoSession(session.id)).toBe(false); // Not expired yet
    expect(clearExpiredSudoSession("non-existent")).toBe(false);
    
    vi.advanceTimersByTime(2000); // 2 seconds later
    expect(clearExpiredSudoSession(session.id)).toBe(true); // Now expired
    expect(getSession(session.id)?.sudo_session).toBeNull();
    
    vi.useRealTimers();
  });

  it("addMessage adds a message", () => {
    const session = getOrCreateSession("test-msg");
    const msg = addMessage(session.id, {
      type: "user",
      content: "Hello",
    });
    expect(msg?.id.startsWith("msg_")).toBe(true);
    expect(msg?.content).toBe("Hello");
    expect(getSession(session.id)?.messages.length).toBe(1);
    expect(addMessage("non-existent", { type: "user", content: "hi" })).toBeNull();
  });

  it("addAuditEntry and getAuditTrail work correctly", () => {
    const entry = addAuditEntry({
      user_id: "userX",
      action: "read_commits",
      scope: "read",
      status: "allowed",
      resource: "owner/repo",
      agent_reasoning: null,
      action_intent_hash: null,
      token_ttl_seconds: null,
      approval_method: null,
    });
    expect(entry.id.startsWith("audit_")).toBe(true);
    expect(entry.created_at).toBeTruthy();
    
    const trail = getAuditTrail();
    expect(trail.length).toBeGreaterThan(0);
    expect(trail[0]).toBe(entry); // Newest first
    
    // Check limit
    for (let i = 0; i < 60; i++) {
        addAuditEntry({
            user_id: `userX`,
            action: "read_commits",
            scope: "read",
            status: "allowed",
            resource: "owner/repo",
            agent_reasoning: null,
            action_intent_hash: null,
            token_ttl_seconds: null,
            approval_method: null,
        });
    }
    expect(getAuditTrail(10).length).toBe(10);
  });

  it("getAllSessions and getSession work correctly", () => {
    const session = getOrCreateSession("test-get", "user1");
    expect(getSession(session.id)).toBe(session);
    expect(getSession("non-existent")).toBeNull();

    const sessions = getAllSessions();
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions).toContain(session);
  });
});
