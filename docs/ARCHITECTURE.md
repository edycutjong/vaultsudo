# 🏗 VaultSudo — Architecture

> Zero-Trust `sudo` for AI Agents

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Dashboard["VaultSudo Dashboard (Next.js 16)"]
        AT["Agent Terminal<br/>(Chat + Tool Results)"]
        SP["Permission Scopes Panel<br/>(R/W Badges)"]
        AuditUI["Audit Trail<br/>(Immutable Log Viewer)"]
        Banner["Step-Up Auth Banner<br/>(Action Intent Diff + Approve/Deny)"]

        AT --> Banner
        SP --> Banner
        AuditUI --> Banner
    end

    subgraph API["API Routes"]
        R1["POST /api/agent"]
        R2["GET /api/audit"]
        R3["POST /api/demo/attack"]
        R4["POST /api/webhook/ciba"]
    end

    subgraph Gate["VaultSudo Gate (vault-sudo.ts)"]
        G1["1. Classify Scope (R vs W)"]
        G2["2. Dangerous Action Block"]
        G3["3. Sudo Session Check"]
        G4["4. Gate Result (allow/block)"]

        G1 --> G2 --> G3 --> G4
    end

    subgraph Session["Session Manager (session.ts)"]
        S1["Agent Sessions (messages)"]
        S2["Sudo Sessions (scope + TTL)"]
        S3["Pending Actions"]
        S4["Audit Log (append-only)"]
    end

    Banner --> API
    API --> Gate
    Gate --> Session

    style Dashboard fill:#0f1629,stroke:#1e293b,color:#e2e8f0
    style API fill:#1a1a2e,stroke:#6366f1,color:#c7d2fe
    style Gate fill:#1a1a2e,stroke:#f59e0b,color:#fde68a
    style Session fill:#1a1a2e,stroke:#22c55e,color:#bbf7d0
```

---

## Request Flow

### Read Path (Zero Friction)

```mermaid
flowchart TD
    A["👤 User Message:<br/>'Investigate the CI'"] --> B["POST /api/agent"]
    B --> C{"classifyScope('read_ci_status')"}
    C -->|"'read'"| D["vaultSudoGate()"]
    D -->|"allowed: true"| E["✅ Execute tool, return results"]
    E --> F["📋 addAuditEntry()"]

    style A fill:#0f1629,stroke:#94a3b8,color:#e2e8f0
    style C fill:#1a1a2e,stroke:#22c55e,color:#bbf7d0
    style D fill:#1a1a2e,stroke:#22c55e,color:#bbf7d0
    style E fill:#1a1a2e,stroke:#22c55e,color:#bbf7d0
    style F fill:#1a1a2e,stroke:#6366f1,color:#c7d2fe
```

### Write Path (Gated)

```mermaid
flowchart TD
    A["👤 User Message:<br/>'Revert the bad commit'"] --> B["POST /api/agent"]
    B --> C{"classifyScope('revert_commit')"}
    C -->|"'write'"| D["vaultSudoGate()"]
    D -->|"No active Sudo Session"| E["🛑 allowed: false, status: 'pending'"]
    E --> F["setPendingAction()"]
    F --> G["Return security_alert + approval_request"]
    G --> H["🔶 UI shows Step-Up Auth Banner"]

    H --> I["👤 Human clicks 'Approve'"]
    I --> J["POST /api/webhook/ciba"]
    J --> K["createSudoSession(scope, ttl, actions)"]
    K --> L["setSudoSession()"]
    L --> M["clearPendingAction()"]
    M --> N["📋 addAuditEntry(status: 'approved')"]

    style A fill:#0f1629,stroke:#94a3b8,color:#e2e8f0
    style C fill:#1a1a2e,stroke:#f59e0b,color:#fde68a
    style E fill:#1a1a2e,stroke:#ef4444,color:#fecaca
    style H fill:#1a1a2e,stroke:#f59e0b,color:#fde68a
    style I fill:#0f1629,stroke:#22c55e,color:#bbf7d0
    style K fill:#1a1a2e,stroke:#22c55e,color:#bbf7d0
    style N fill:#1a1a2e,stroke:#6366f1,color:#c7d2fe
```

### Attack Path (Blocked)

```mermaid
flowchart TD
    A["💀 Attack Button"] --> B["POST /api/demo/attack"]
    B --> C["Forwards to /api/agent<br/>with isAttack=true"]
    C --> D["handleAttackScenario()"]
    D --> E["Agent 'falls for' injection"]
    E --> F["Attempts delete_repo"]
    F --> G{"DANGEROUS_ACTIONS check"}
    G -->|"delete_repo in blocklist"| H["🚫 allowed: false, status: 'blocked'"]

    H --> I["📋 addAuditEntry(status: 'blocked')"]
    I --> J["Return security_alert +<br/>agent recovery messages"]

    G -.->|"Checked BEFORE session eval"| K["Defense-in-Depth:<br/>No session can override"]

    style A fill:#1a1a2e,stroke:#ef4444,color:#fecaca
    style G fill:#1a1a2e,stroke:#ef4444,color:#fecaca
    style H fill:#450a0a,stroke:#ef4444,color:#fecaca
    style K fill:#1a1a2e,stroke:#f59e0b,color:#fde68a,stroke-dasharray: 5 5
```

---

## Core Components

### `vault-sudo.ts` — The Heart

The middleware that intercepts every tool call.

| Concept | Implementation |
|---------|---------------|
| **Scope Classification** | `TOOL_SCOPE_MAP` — maps tool names to `"read"` or `"write"`. Unknown tools default to `"write"` (fail-closed). |
| **Scope Patterns** | `TOOL_SCOPE_PATTERNS` — maps write tools to REST-like resource patterns (e.g., `repos/*/git/refs`). |
| **Dangerous Actions** | Hardcoded `DANGEROUS_ACTIONS` array. Checked **before** session validation. Cannot be overridden. |
| **Action Intent Diff** | `formatActionIntent()` converts a tool call into a human-readable string like `⚠️ Agent attempting: POST /repos/acme-corp/api-gateway/git/refs (revert mno7890)` |
| **Sudo Session Matching** | `sessionCoversScope()` — glob pattern matching with `*` wildcard support. Also validates expiry and `approved_actions` list. |

### `session.ts` — State Manager

In-memory session store managing the full agent lifecycle.

| Store | Content |
|-------|---------|
| `sessions: Map<string, AgentSession>` | Agent sessions with message history, status, pending actions |
| `auditTrail: AuditLogEntry[]` | Append-only audit log (in-memory for mock, Supabase in production) |
| Sudo Session | Nested inside `AgentSession` — scope-bound, time-limited auth token |

### `tools.ts` — Tool Definitions

Defines the agent's available tools, separated into read (no friction) and write (gated).

| Category | Tools |
|----------|-------|
| **Read** | `read_commits`, `read_pull_requests`, `read_ci_status`, `read_issues`, `read_repo_info` |
| **Write** | `revert_commit`, `merge_pull_request`, `close_issue`, `create_comment`, `delete_branch`, `delete_repo` |

---

## Security Model

### Defense-in-Depth Layers

```mermaid
flowchart TD
    L1["🔍 Layer 1: Scope Classification"]
    L1a["Unknown tools → default to 'write' (fail-closed)"]

    L2["🚫 Layer 2: Dangerous Action Blocklist"]
    L2a["delete_repo, force_push, delete_branch"]
    L2b["Checked BEFORE session validation"]
    L2c["Cannot be overridden by ANY Sudo Session"]

    L3["🔑 Layer 3: Sudo Session Validation"]
    L3a["Scope pattern matching (glob)"]
    L3b["TTL expiry check"]
    L3c["Allowed actions list enforcement"]

    L4["📋 Layer 4: Audit Trail"]
    L4a["Every gate evaluation logged"]
    L4b["Immutable append-only store"]
    L4c["Action intent hashes for tamper detection"]

    L1 --> L1a
    L1 --> L2
    L2 --> L2a
    L2 --> L2b
    L2 --> L2c
    L2 --> L3
    L3 --> L3a
    L3 --> L3b
    L3 --> L3c
    L3 --> L4
    L4 --> L4a
    L4 --> L4b
    L4 --> L4c

    style L1 fill:#1a1a2e,stroke:#22c55e,color:#bbf7d0
    style L2 fill:#1a1a2e,stroke:#ef4444,color:#fecaca
    style L3 fill:#1a1a2e,stroke:#f59e0b,color:#fde68a
    style L4 fill:#1a1a2e,stroke:#6366f1,color:#c7d2fe
```

### Key Security Decisions

| Decision | Rationale |
|----------|-----------|
| Unknown tools default to `"write"` | Fail-closed prevents privilege escalation via tool injection |
| Dangerous actions checked before sessions | Even a compromised session can't authorize `delete_repo` |
| Unknown tool scope pattern = `__blocked__/unknown` | Prevents accidental glob matching against a broad session |
| Action intent hashing | Creates a tamper-evident chain for compliance |
| Short TTL (default 600s / 10 min) | Limits blast radius of a compromised Sudo Session |

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | Next.js 16 (App Router) | SSR, API routes, React 19 |
| **Styling** | Tailwind CSS v4 | Utility-first styling |
| **Animation** | Framer Motion | Step-up banner, terminal animations |
| **Auth (planned)** | Auth0 CIBA | Out-of-band push authentication |
| **Agent (planned)** | Vercel AI SDK | LLM orchestration |
| **Database (planned)** | Supabase (PostgreSQL + RLS) | Immutable audit trail, persistent sessions |

---

## File Structure

```
src/
├── agent/
│   ├── vault-sudo.ts      # 🔒 Core middleware (scope, gate, session matching)
│   ├── session.ts          # 💾 In-memory session + audit store
│   ├── tools.ts            # 🛠 Tool definitions (read + write)
│   └── system-prompt.ts    # 🤖 Agent system prompt
├── app/
│   ├── page.tsx            # 🖥 Main dashboard page
│   ├── layout.tsx          # 📐 Root layout + fonts
│   ├── globals.css         # 🎨 Design system (cybersec theme)
│   └── api/
│       ├── agent/route.ts       # POST — Agent message handler
│       ├── audit/route.ts       # GET — Audit trail retrieval
│       ├── demo/attack/route.ts # POST — Attack simulation
│       └── webhook/ciba/route.ts # POST — CIBA approval callback
├── components/
│   ├── agent-terminal.tsx  # 💻 Terminal UI (messages + interaction)
│   ├── scope-panel.tsx     # 🔑 Permission scope visualization
│   ├── audit-trail.tsx     # 📋 Audit log viewer
│   ├── step-up-banner.tsx  # ⚡ Step-up auth overlay (approve/deny)
│   └── attack-button.tsx   # 💀 Prompt injection demo trigger
└── lib/
    └── types.ts            # 📝 TypeScript type definitions
```
