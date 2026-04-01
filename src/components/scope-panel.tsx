"use client";

/* ═══════════════════════════════════════════════════════════
   ScopePanel — Permission Visualization
   Shows current agent scopes, active Sudo Session, and
   scope diff when elevation is requested.
   ═══════════════════════════════════════════════════════════ */

import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Pencil,
  Lock,
  Unlock,
  Timer,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import type { SudoSession, PendingAction } from "@/lib/types";

interface ScopePanelProps {
  sudoSession: SudoSession | null;
  pendingAction: PendingAction | null;
  sessionStatus: string;
}

/** Read scope definitions */
const READ_SCOPES = [
  { name: "read_commits", label: "Commits", icon: Eye },
  { name: "read_pull_requests", label: "Pull Requests", icon: Eye },
  { name: "read_ci_status", label: "CI Status", icon: Eye },
  { name: "read_issues", label: "Issues", icon: Eye },
];

/** Write scope definitions */
const WRITE_SCOPES = [
  { name: "revert_commit", label: "Revert Commit", icon: Pencil },
  { name: "merge_pull_request", label: "Merge PR", icon: Pencil },
  { name: "close_issue", label: "Close Issue", icon: Pencil },
  { name: "create_comment", label: "Comment", icon: Pencil },
  { name: "delete_repo", label: "Delete Repo", icon: ShieldAlert, dangerous: true },
];

export default function ScopePanel({
  sudoSession,
  pendingAction,
  sessionStatus,
}: ScopePanelProps) {
  const _isWaiting = sessionStatus === "paused_awaiting_auth";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{
          borderColor: "var(--vault-border)",
          background: "rgba(15, 22, 41, 0.8)",
        }}
      >
        <KeyRound size={14} className="text-(--vault-amber)" />
        <span
          className="text-xs font-semibold tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--vault-text-secondary)",
          }}
        >
          PERMISSION SCOPES
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Read Scopes */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Eye size={12} className="text-(--vault-green)" />
            <span
              className="text-[10px] font-semibold tracking-widest"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--vault-green)",
              }}
            >
              READ (ALWAYS ACTIVE)
            </span>
          </div>
          <div className="space-y-1">
            {READ_SCOPES.map((scope) => (
              <div
                key={scope.name}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
                style={{
                  background: "var(--vault-green-glow)",
                  border: "1px solid rgba(34, 197, 94, 0.1)",
                }}
              >
                <Unlock size={10} className="text-(--vault-green)" />
                <span
                  className="text-[11px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-green)",
                  }}
                >
                  {scope.label}
                </span>
                <span className="ml-auto">
                  <div
                    className="pulse-dot"
                    style={{ background: "var(--vault-green)" }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Write Scopes */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lock size={12} className="text-(--vault-red)" />
            <span
              className="text-[10px] font-semibold tracking-widest"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--vault-red)",
              }}
            >
              WRITE (GATED BY VAULTSUDO)
            </span>
          </div>
          <div className="space-y-1">
            {WRITE_SCOPES.map((scope) => {
              const isApproved =
                sudoSession?.approved_actions.includes(scope.name);
              const isPending =
                pendingAction?.tool_name === scope.name;

              return (
                <motion.div
                  key={scope.name}
                  animate={
                    isPending
                      ? { borderColor: ["rgba(245,158,11,0.2)", "rgba(245,158,11,0.5)", "rgba(245,158,11,0.2)"] }
                      : {}
                  }
                  transition={isPending ? { duration: 1.5, repeat: Infinity } : {}}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md"
                  style={{
                    background: isApproved
                      ? "var(--vault-blue-glow)"
                      : isPending
                      ? "var(--vault-amber-glow)"
                      : scope.dangerous
                      ? "var(--vault-red-glow)"
                      : "rgba(148, 163, 184, 0.03)",
                    border: `1px solid ${
                      isApproved
                        ? "rgba(59, 130, 246, 0.2)"
                        : isPending
                        ? "rgba(245, 158, 11, 0.2)"
                        : scope.dangerous
                        ? "rgba(239, 68, 68, 0.1)"
                        : "var(--vault-border)"
                    }`,
                  }}
                >
                  {isApproved ? (
                    <Unlock size={10} className="text-(--vault-blue)" />
                  ) : (
                    <Lock
                      size={10}
                      className={
                        scope.dangerous
                          ? "text-(--vault-red)"
                          : "text-(--vault-text-muted)"
                      }
                    />
                  )}
                  <span
                    className="text-[11px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: isApproved
                        ? "var(--vault-blue)"
                        : isPending
                        ? "var(--vault-amber)"
                        : scope.dangerous
                        ? "var(--vault-red)"
                        : "var(--vault-text-muted)",
                    }}
                  >
                    {scope.label}
                  </span>
                  {scope.dangerous && (
                    <ShieldAlert
                      size={10}
                      className="ml-auto text-(--vault-red)"
                    />
                  )}
                  {isApproved && (
                    <ShieldCheck
                      size={10}
                      className="ml-auto text-(--vault-blue)"
                    />
                  )}
                  {isPending && (
                    <Timer
                      size={10}
                      className="ml-auto text-(--vault-amber)"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Active Sudo Session */}
        <AnimatePresence>
          {sudoSession && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg p-3 glow-green"
              style={{
                background: "var(--vault-green-glow)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-(--vault-green)" />
                <span
                  className="text-[10px] font-semibold tracking-widest"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-green)",
                  }}
                >
                  SUDO SESSION ACTIVE
                </span>
              </div>
              <div className="space-y-1">
                <div
                  className="text-[11px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-secondary)",
                  }}
                >
                  Scope: <code className="text-(--vault-green)">{sudoSession.scope_pattern}</code>
                </div>
                <div
                  className="text-[11px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-secondary)",
                  }}
                >
                  TTL: <code className="text-(--vault-amber)">{sudoSession.ttl_seconds}s</code>
                </div>
                <div
                  className="text-[11px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-secondary)",
                  }}
                >
                  Expires: {new Date(sudoSession.expires_at).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
 
