"use client";

/* ═══════════════════════════════════════════════════════════
   AgentTerminal — Streaming terminal UI
   Shows agent messages with typewriter effect and color-coded
   output based on VaultSudo scope/status.
   ═══════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Terminal,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Bot,
  User,
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
} from "lucide-react";
import type { AgentMessage } from "@/lib/types";

interface AgentTerminalProps {
  messages: AgentMessage[];
  onSendMessage: (message: string) => void;
  onAttack?: () => void;
  isLoading: boolean;
}

/** Get icon for message type */
function getMessageIcon(msg: AgentMessage) {
  const size = 14;
  switch (msg.type) {
    case "user":
      return <User size={size} />;
    case "agent":
      return <Bot size={size} />;
    case "system":
      return <Zap size={size} />;
    case "tool_call":
      return <Wrench size={size} />;
    case "tool_result":
      return msg.status === "allowed" ? (
        <CheckCircle2 size={size} />
      ) : (
        <ShieldAlert size={size} />
      );
    case "security_alert":
      return <ShieldAlert size={size} />;
    case "approval_request":
      return <Clock size={size} />;
    case "approval_response":
      return msg.status === "approved" ? (
        <ShieldCheck size={size} />
      ) : (
        <XCircle size={size} />
      );
    default:
      return <Terminal size={size} />;
  }
}

/** Get color class for message */
function getMessageColor(msg: AgentMessage): string {
  if (msg.status === "blocked") return "text-(--vault-red)";
  if (msg.status === "pending") return "text-(--vault-amber)";
  if (msg.status === "approved") return "text-(--vault-blue)";
  if (msg.status === "denied") return "text-(--vault-red)";

  switch (msg.type) {
    case "user":
      return "text-(--vault-text-primary)";
    case "agent":
      return "text-(--vault-green)";
    case "system":
      return "text-(--vault-purple)";
    case "tool_call":
      return "text-(--vault-blue)";
    case "tool_result":
      return "text-(--vault-green)";
    case "security_alert":
      return "text-(--vault-red)";
    case "approval_request":
      return "text-(--vault-amber)";
    case "approval_response":
      return "text-(--vault-blue)";
    default:
      return "text-(--vault-text-secondary)";
  }
}

/** Get background for message */
function getMessageBg(msg: AgentMessage): string {
  if (msg.status === "blocked")
    return "bg-(--vault-red-glow) border-l-2 border-(--vault-red)";
  if (msg.type === "security_alert")
    return "bg-(--vault-red-glow) border-l-2 border-(--vault-red)";
  if (msg.type === "approval_request")
    return "bg-(--vault-amber-glow) border-l-2 border-(--vault-amber)";
  if (msg.status === "approved")
    return "bg-(--vault-blue-glow) border-l-2 border-(--vault-blue)";
  if (msg.type === "user")
    return "bg-[rgba(148,163,184,0.05)]";
  return "";
}

/** Get label for message type */
function getMessageLabel(msg: AgentMessage): string {
  switch (msg.type) {
    case "user":
      return "YOU";
    case "agent":
      return "AGENT";
    case "system":
      return "SYSTEM";
    case "tool_call":
      return "TOOL CALL";
    case "tool_result":
      return "RESULT";
    case "security_alert":
      return "SECURITY";
    case "approval_request":
      return "APPROVAL";
    case "approval_response":
      return msg.status === "approved" ? "APPROVED" : "DENIED";
    default:
      return "LOG";
  }
}

export default function AgentTerminal({
  messages,
  onSendMessage,
  onAttack,
  isLoading,
}: AgentTerminalProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Terminal Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{
          borderColor: "var(--vault-border)",
          background: "rgba(15, 22, 41, 0.8)",
        }}
      >
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2 ml-3">
          <Terminal size={14} className="text-(--vault-text-muted)" />
          <span
            className="text-xs font-medium"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--vault-text-muted)",
            }}
          >
            vaultsudo@agent ~ $
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Shield size={14} className="text-(--vault-green)" />
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--vault-green)",
            }}
          >
            PROTECTED
          </span>
        </div>
      </div>

      {/* Message Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        style={{ background: "var(--vault-bg-primary)" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Shield
              size={48}
              className="text-(--vault-green) mb-4 opacity-30"
            />
            <p
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--vault-text-primary)" }}
            >
              VaultSudo Agent Terminal
            </p>
            <p
              className="text-xs mb-5 max-w-md"
              style={{
                color: "var(--vault-text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              Try a demo scenario below to see zero-trust agent authorization in action.
            </p>

            <div className="grid grid-cols-1 gap-2.5 w-full max-w-md">
              {/* Scenario 1: Safe Read */}
              <button
                onClick={() =>
                  onSendMessage(
                    "Investigate the failing CI pipeline for the auth service. Check recent commits and CI status."
                  )
                }
                disabled={isLoading}
                className="group flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all"
                style={{
                  background: "rgba(34, 197, 94, 0.05)",
                  border: "1px solid rgba(34, 197, 94, 0.15)",
                }}
              >
                <div
                  className="shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(34, 197, 94, 0.1)" }}
                >
                  <CheckCircle2 size={16} className="text-(--vault-green)" />
                </div>
                <div>
                  <span
                    className="text-xs font-semibold block"
                    style={{ color: "var(--vault-green)" }}
                  >
                    Safe Read — No Auth Needed
                  </span>
                  <span
                    className="text-[11px] block mt-0.5"
                    style={{
                      color: "var(--vault-text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    &quot;Investigate failing CI pipeline…&quot;
                  </span>
                </div>
              </button>

              {/* Scenario 2: Write Escalation */}
              <button
                onClick={() =>
                  onSendMessage(
                    "The bad commit mno7890 broke the build. Please revert that commit immediately."
                  )
                }
                disabled={isLoading}
                className="group flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all"
                style={{
                  background: "rgba(245, 158, 11, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.15)",
                }}
              >
                <div
                  className="shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(245, 158, 11, 0.1)" }}
                >
                  <Clock size={16} className="text-(--vault-amber)" />
                </div>
                <div>
                  <span
                    className="text-xs font-semibold block"
                    style={{ color: "var(--vault-amber)" }}
                  >
                    Write Blocked — Step-Up Auth Required
                  </span>
                  <span
                    className="text-[11px] block mt-0.5"
                    style={{
                      color: "var(--vault-text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    &quot;Revert the bad commit mno7890…&quot;
                  </span>
                </div>
              </button>

              {/* Scenario 3: Prompt Injection Attack */}
              <button
                onClick={() => onAttack?.()}
                disabled={isLoading}
                className="group flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all"
                style={{
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.15)",
                }}
              >
                <div
                  className="shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(239, 68, 68, 0.1)" }}
                >
                  <ShieldAlert size={16} className="text-(--vault-red)" />
                </div>
                <div>
                  <span
                    className="text-xs font-semibold block"
                    style={{ color: "var(--vault-red)" }}
                  >
                    🔴 Prompt Injection Attack
                  </span>
                  <span
                    className="text-[11px] block mt-0.5"
                    style={{
                      color: "var(--vault-text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Simulates a hijacked agent attempting &quot;delete_repo&quot;
                  </span>
                </div>
              </button>

              {/* Scenario 4: Bulk Read */}
              <button
                onClick={() =>
                  onSendMessage(
                    "List all recent pull requests and check which ones have merge conflicts."
                  )
                }
                disabled={isLoading}
                className="group flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all"
                style={{
                  background: "rgba(99, 102, 241, 0.05)",
                  border: "1px solid rgba(99, 102, 241, 0.15)",
                }}
              >
                <div
                  className="shrink-0 mt-0.5 w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(99, 102, 241, 0.1)" }}
                >
                  <Zap size={16} className="text-(--vault-blue)" />
                </div>
                <div>
                  <span
                    className="text-xs font-semibold block"
                    style={{ color: "var(--vault-blue)" }}
                  >
                    Bulk Read — Autonomous Agent Work
                  </span>
                  <span
                    className="text-[11px] block mt-0.5"
                    style={{
                      color: "var(--vault-text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    &quot;List PRs and check for merge conflicts…&quot;
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i > messages.length - 5 ? 0.05 * (i - (messages.length - 5)) : 0 }}
              className={`rounded-lg px-3 py-2.5 ${getMessageBg(msg)}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={getMessageColor(msg)}>
                  {getMessageIcon(msg)}
                </span>
                <span
                  className="text-[10px] font-semibold tracking-wider"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-muted)",
                  }}
                >
                  {getMessageLabel(msg)}
                </span>
                {msg.scope && (
                  <span
                    className={`status-badge ${
                      msg.scope === "read"
                        ? "status-badge--read"
                        : msg.status === "blocked"
                        ? "status-badge--blocked"
                        : msg.status === "pending"
                        ? "status-badge--pending"
                        : msg.status === "approved"
                        ? "status-badge--approved"
                        : "status-badge--pending"
                    }`}
                  >
                    {msg.scope}
                  </span>
                )}
                <span
                  className="ml-auto text-[10px]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--vault-text-muted)",
                  }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div
                className="terminal-text whitespace-pre-wrap"
                style={{
                  color:
                    msg.type === "user"
                      ? "var(--vault-text-primary)"
                      : undefined,
                }}
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(msg.content),
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-(--vault-green)"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
            <span
              className="text-xs"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--vault-text-muted)",
              }}
            >
              Agent processing...
            </span>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <form
        suppressHydrationWarning
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t"
        style={{
          borderColor: "var(--vault-border)",
          background: "rgba(15, 22, 41, 0.8)",
        }}
      >
        <span
          className="text-xs"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--vault-green)",
          }}
        >
          $
        </span>
        <input
          suppressHydrationWarning
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent to investigate..."
          disabled={isLoading}
          autoComplete="off"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-(--vault-text-muted)"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--vault-text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-1.5 rounded-md transition-all"
          style={{
            background:
              input.trim() && !isLoading
                ? "var(--vault-green)"
                : "transparent",
            color:
              input.trim() && !isLoading
                ? "var(--vault-bg-primary)"
                : "var(--vault-text-muted)",
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

/** Simple markdown-to-HTML for terminal messages */
function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code style="background:rgba(148,163,184,0.1);padding:0.1em 0.3em;border-radius:3px;font-size:0.85em">$1</code>')
    .replace(/^## (.*?)$/gm, '<div style="font-size:1em;font-weight:600;margin-top:0.5em;margin-bottom:0.25em">$1</div>')
    .replace(/^### (.*?)$/gm, '<div style="font-size:0.9em;font-weight:600;margin-top:0.5em;margin-bottom:0.25em">$1</div>')
    .replace(/^• (.*?)$/gm, '<div style="padding-left:1em">• $1</div>')
    .replace(/^- (.*?)$/gm, '<div style="padding-left:1em">• $1</div>')
    .replace(/\n/g, "<br />");
}
 
