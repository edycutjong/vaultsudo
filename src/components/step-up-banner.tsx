"use client";

/* ═══════════════════════════════════════════════════════════
   StepUpBanner — Blocked State Overlay
   Shows Action Intent Diff and approval controls when
   VaultSudo blocks a write action.
   ═══════════════════════════════════════════════════════════ */

import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Fingerprint,
  AlertTriangle,
} from "lucide-react";
import type { PendingAction } from "@/lib/types";

interface StepUpBannerProps {
  pendingAction: PendingAction | null;
  onApprove: () => void;
  onDeny: () => void;
  isProcessing: boolean;
}

export default function StepUpBanner({
  pendingAction,
  onApprove,
  onDeny,
  isProcessing,
}: StepUpBannerProps) {
  return (
    <AnimatePresence>
      {pendingAction && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-x-0 top-0 z-50 mx-4 mt-4"
        >
          <div
            className="rounded-xl overflow-hidden glow-amber"
            style={{
              background: "rgba(15, 22, 41, 0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            {/* Header Bar */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{
                background: "var(--vault-amber-glow)",
                borderBottom: "1px solid rgba(245, 158, 11, 0.2)",
              }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <ShieldAlert size={18} className="text-(--vault-amber)" />
              </motion.div>
              <span
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--vault-amber)",
                }}
              >
                VAULTSUDO — STEP-UP AUTHENTICATION REQUIRED
              </span>
            </div>

            {/* Content */}
            <div className="px-4 py-4 space-y-3">
              {/* Action Intent Diff */}
              <div>
                <div
                  className="text-[10px] font-semibold tracking-widest mb-1.5"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-muted)",
                  }}
                >
                  ACTION INTENT DIFF
                </div>
                <div
                  className="rounded-md px-3 py-2"
                  style={{
                    background: "rgba(245, 158, 11, 0.05)",
                    border: "1px solid rgba(245, 158, 11, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      size={14}
                      className="text-(--vault-amber) shrink-0"
                    />
                    <span
                      className="text-sm"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--vault-amber)",
                      }}
                    >
                      {pendingAction.action_intent}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  className="text-[10px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-muted)",
                  }}
                >
                  Tool:{" "}
                  <span className="text-(--vault-amber)">
                    {pendingAction.tool_name}
                  </span>
                </div>
                <div
                  className="text-[10px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-muted)",
                  }}
                >
                  Scope:{" "}
                  <span className="text-(--vault-amber)">
                    {pendingAction.required_scope}
                  </span>
                </div>
              </div>

              {/* CIBA Push Notification Simulation */}
              <div
                className="rounded-md px-3 py-2 flex items-center gap-2"
                style={{
                  background: "rgba(148, 163, 184, 0.03)",
                  border: "1px solid var(--vault-border)",
                }}
              >
                <Fingerprint
                  size={16}
                  className="text-(--vault-blue)"
                />
                <div>
                  <div
                    className="text-[11px] font-medium"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--vault-text-secondary)",
                    }}
                  >
                    Push notification sent to device
                  </div>
                  <div
                    className="text-[10px]"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--vault-text-muted)",
                    }}
                  >
                    CIBA backchannel authentication • Awaiting response
                  </div>
                </div>
                <motion.div
                  className="ml-auto flex gap-1"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-(--vault-blue)"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </motion.div>
              </div>

              {/* Approval Buttons (Demo) */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onApprove}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all font-medium text-sm"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: isProcessing
                      ? "rgba(34, 197, 94, 0.1)"
                      : "var(--vault-green)",
                    color: isProcessing
                      ? "var(--vault-green)"
                      : "var(--vault-bg-primary)",
                    cursor: isProcessing ? "wait" : "pointer",
                  }}
                >
                  <ShieldCheck size={16} />
                  {isProcessing ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={onDeny}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all font-medium text-sm"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "var(--vault-red)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    cursor: isProcessing ? "wait" : "pointer",
                  }}
                >
                  <XCircle size={16} />
                  Deny
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
