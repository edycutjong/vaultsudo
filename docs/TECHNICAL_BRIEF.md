# 🛡 VaultSudo — Technical Brief (HackVision 2026)

> **"Read Freely, Write Never — Unless Human-Verified."**

VaultSudo is a zero-trust security layer designed specifically for autonomous AI agents. It eliminates the risk of "permanent, over-privileged API keys" by gating every destructive agent action behind a human-in-the-loop "sudo" protocol.

---

### 🛡 The Security Problem
AI agents (GitHub Copilot, Cursor, LangChain) typically operate with broad, permanent permissions. This makes them vulnerable to **Prompt Injection** and **Privilege Escalation**. A single malicious input can trigger an agent to delete a repository, force-push bad code, or leak credentials in milliseconds.

### 🔑 The VaultSudo Solution: Zero-Trust "Sudo"
VaultSudo introduces a middleware gate that intercepts every tool call from an AI agent. It classifies actions into two scopes:
1.  **Read (Zero-Friction)**: Agents can read logs, commits, and issues autonomously. No lag for investigation.
2.  **Write (Gated)**: Any attempt to modify code or infrastructure is blocked and requires a **Sudo Session**.

---

### 🧱 Defense-in-Depth Architecture

| Layer | Defense Mechanism | Rationale |
|:---|:---|:---|
| **1. Fail-Closed Classification** | Unknown tools → `"write"` | Prevents "Tool Hallucination" from bypassing security. |
| **2. Dangerous Action Blocklist** | Unconditional `delete_repo` block | Even an authorized session cannot perform lethal actions. |
| **3. Action Intent Diff** | Human-readable diffs | Shows the human *exactly* what the agent intends to do. |
| **4. Sudo Sessions** | Scope-bound & Time-limited | Access is granted for 10 minutes for a specific resource glob only. |
| **5. CIBA Integration** | Out-of-band Push Auth | Authorization happens on the human's device, decoupled from the agent. |

---

### 📋 Compliance & Enterprise Ready
VaultSudo is designed to meet rigorous enterprise standards from Day 1:
- **SOC 2 Audit Trail**: Every gate evaluation (allow/block/pending) is cryptographically hashed in an append-only log.
- **ISO 27001 Least Privilege**: Agents have zero write-access by default.
- **OWASP AI Mitigation**: Specifically addresses the "Insecure Output Handling" and "Excessive Agency" risks in LLM applications.

---

### 🛠 Tech Stack
- **Next.js 16 (App Router)** & **React 19**
- **Tailwind CSS v4** (High-fidelity "CyberSec" UI)
- **Framer Motion** (Subtle micro-animations for UX clarity)
- **Supabase** (Immutable audit trail storage)
- **Auth0 CIBA** (Standardized out-of-band push authentication)

---
**VaultSudo: Scale your agents, not your risk.**
