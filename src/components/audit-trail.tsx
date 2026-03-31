"use client";

/* ═══════════════════════════════════════════════════════════
   AuditTrail — Real-Time Immutable Log Display
   Shows all agent actions with status badges and timestamps.
   ═══════════════════════════════════════════════════════════ */

import { motion, AnimatePresence } from "framer-motion";
import {
  ScrollText,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { AuditLogEntry } from "@/lib/types";

interface AuditTrailProps {
  entries: AuditLogEntry[];
}

function getStatusIcon(status: string) {
  const size = 12;
  switch (status) {
    case "allowed":
      return <CheckCircle2 size={size} className="text-[var(--vault-green)]" />;
    case "approved":
      return <ShieldCheck size={size} className="text-[var(--vault-blue)]" />;
    case "blocked":
      return <ShieldAlert size={size} className="text-[var(--vault-red)]" />;
    case "pending":
      return <Clock size={size} className="text-[var(--vault-amber)]" />;
    case "denied":
      return <XCircle size={size} className="text-[var(--vault-red)]" />;
    default:
      return <CheckCircle2 size={size} className="text-[var(--vault-text-muted)]" />;
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "allowed":
      return "status-badge--read";
    case "approved":
      return "status-badge--approved";
    case "blocked":
      return "status-badge--blocked";
    case "pending":
      return "status-badge--pending";
    case "denied":
      return "status-badge--blocked";
    default:
      return "";
  }
}

export default function AuditTrail({ entries }: AuditTrailProps) {
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
        <ScrollText size={14} className="text-[var(--vault-purple)]" />
        <span
          className="text-xs font-semibold tracking-wider"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--vault-text-secondary)",
          }}
        >
          IMMUTABLE AUDIT TRAIL
        </span>
        <span
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--vault-purple)",
            background: "var(--vault-purple-glow)",
          }}
        >
          SOC2
        </span>
      </div>

      {/* Entries */}
      <div
        className="flex-1 overflow-y-auto p-3 space-y-1.5"
        style={{ background: "var(--vault-bg-primary)" }}
      >
        {entries.length === 0 && (
          <div
            className="flex flex-col items-center justify-center h-full"
            style={{ color: "var(--vault-text-muted)" }}
          >
            <ScrollText size={32} className="mb-2 opacity-30" />
            <p
              className="text-xs"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              No audit entries yet
            </p>
          </div>
        )}

        <AnimatePresence>
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i < 5 ? i * 0.05 : 0 }}
              className="rounded-md px-2.5 py-2"
              style={{
                background: "rgba(148, 163, 184, 0.02)",
                border: "1px solid var(--vault-border)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {getStatusIcon(entry.status)}
                <span
                  className="text-[11px] font-medium"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-primary)",
                  }}
                >
                  {entry.action}
                </span>
                <span className={`status-badge ${getStatusClass(entry.status)}`}>
                  {entry.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-muted)",
                  }}
                >
                  {entry.scope === "read" ? "🟢" : "🔴"} {entry.scope}
                </span>
                {entry.resource && (
                  <span
                    className="text-[10px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--vault-text-muted)",
                    }}
                  >
                    {entry.resource}
                  </span>
                )}
                <span
                  className="ml-auto text-[9px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-muted)",
                  }}
                >
                  {new Date(entry.created_at).toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
