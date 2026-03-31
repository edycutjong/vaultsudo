"use client";

/* ═══════════════════════════════════════════════════════════
   AttackButton — Prompt Injection Demo Trigger
   Red button that triggers a simulated attack scenario.
   ═══════════════════════════════════════════════════════════ */

import { useState } from "react";
import { motion } from "framer-motion";
import { Skull, Zap, ShieldAlert } from "lucide-react";

interface AttackButtonProps {
  onAttack: () => void;
  disabled: boolean;
}

export default function AttackButton({
  onAttack,
  disabled,
}: AttackButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onAttack}
      disabled={disabled}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium"
      style={{
        fontFamily: "var(--font-mono)",
        background: disabled
          ? "rgba(239, 68, 68, 0.05)"
          : "rgba(239, 68, 68, 0.1)",
        color: disabled ? "rgba(239, 68, 68, 0.4)" : "var(--vault-red)",
        border: `1px solid ${
          disabled ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.3)"
        }`,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: isHovered && !disabled
          ? "0 0 20px rgba(239, 68, 68, 0.15)"
          : "none",
      }}
    >
      <motion.div
        animate={
          isHovered && !disabled
            ? { rotate: [0, -10, 10, -10, 0] }
            : {}
        }
        transition={{ duration: 0.4 }}
      >
        <Skull size={16} />
      </motion.div>
      <span className="hidden sm:inline">Prompt Injection Demo</span>
      <span className="sm:hidden">Attack</span>
      {!disabled && (
        <Zap size={12} className="opacity-50" />
      )}
    </motion.button>
  );
}
