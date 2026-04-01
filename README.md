<div align="center">
  <img src="./public/icon-512.png" width="140" height="140" alt="VaultSudo Icon" />
  <h1>VaultSudo</h1>
  <p><strong>Zero-Trust <code>sudo</code> for AI Agents</strong></p>
  <p><em>Read freely. Write never — unless you prove you're human.</em></p>

  <br/>

  ![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
  ![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
  ![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwindcss)
  ![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-FF0055?style=flat-square&logo=framer)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
  ![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)
</div>

---

## 🛑 The Problem

We are entering the era of **Autonomous AI Agents**. These agents are given access to production databases, cloud infrastructure, and GitHub repositories to "do work" for us.

However, the current security paradigm is broken: **Agents are given permanent, over-privileged API keys.** If an agent gets hit with a prompt injection attack or hallucinates, it can delete a repository, push bad code, or drop a database — in milliseconds — before a human can stop it.

## 🟢 The Solution: VaultSudo

VaultSudo acts as a **middleware interception layer** between an AI agent and its tools, modeled after the Unix `sudo` command.

| Principle | How It Works |
|-----------|-------------|
| **Zero-Trust by Default** | Agents get permanent `READ` access — investigate bugs, read docs, analyze data. Zero friction. |
| **Step-Up Authentication** | The millisecond an agent attempts a `WRITE` action (e.g., `merge_pull_request`, `drop_table`), VaultSudo **blocks the request**. |
| **Action Intent Auth** | A push notification (Out-of-Band CIBA) shows the human the exact "Action Intent Diff" — what the agent wants to do, in plain English. |
| **Sudo Sessions** | If approved, VaultSudo mints a **short-lived (5-minute), scope-bound token** for that specific action only. |

---

## 📸 Demo Screenshots

### Zero-Trust Dashboard
> Clean state — all READ scopes unlocked, WRITE scopes locked.

![Dashboard Clean](docs/demo-output/00-dashboard-clean.png)

### Safe Read — Zero Friction
> Agent autonomously reads CI logs and commits. No human needed.

![Read Results](docs/demo-output/01-read-results.png)

### Write Blocked — Step-Up Auth
> Agent tries to revert a commit. VaultSudo blocks it and shows the Action Intent Diff.

![Write Blocked](docs/demo-output/02-write-blocked.png)

### Step-Up Auth Banner
> Human sees exactly what the agent wants to do. Approve or deny with one click.

![Step-Up Banner](docs/demo-output/03-step-up-banner.png)

### Action Approved — Sudo Session Granted
> Short-lived, scope-bound session minted. Agent can execute that specific action.

![Approved](docs/demo-output/04-approved.png)

### Prompt Injection Attack — BLOCKED
> Agent gets hijacked. Tries `delete_repo`. VaultSudo catches it instantly.

![Attack Blocked](docs/demo-output/05-attack-blocked.png)

### Final Dashboard State
> Full audit trail — every action logged, immutable, SOC2-ready.

![Final Dashboard](docs/demo-output/06-final-dashboard.png)

---

## 🛠 Features

- **Cybersecurity Dashboard** — Dark-themed glassmorphism UI with real-time agent monitoring
- **Agent Terminal** — Chat with the agent. Watch it execute reads and hit the sudo wall on writes
- **Permission Scopes Panel** — Live R/W badge visualization with pulsing amber on write attempts
- **Step-Up Auth Banner** — Full Action Intent Diff with approve/deny controls
- **Prompt Injection Demo** — Built-in attack button demonstrating VaultSudo blocking `delete_repo`
- **Immutable Audit Trail** — Every tool call, approval, and denial logged with action intent hashes
- **Mock Mode** — Zero-config demo environment — no API keys, no database, full security logic

---

## 🏗 Architecture

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
        G1["1. Classify Scope"]
        G2["2. Dangerous Action Block"]
        G3["3. Sudo Session Check"]
        G4["4. Gate Result"]

        G1 --> G2 --> G3 --> G4
    end

    subgraph Session["Session Manager (session.ts)"]
        S1["Agent Sessions"]
        S2["Sudo Sessions"]
        S3["Pending Actions"]
        S4["Audit Log"]
    end

    Banner --> API
    API --> Gate
    Gate --> Session
```

### Request Flows

```mermaid
flowchart LR
    subgraph Read["✅ Read Path — Zero Friction"]
        RA["'Investigate CI'"] --> RB["classifyScope()"] --> RC["'read'"] --> RD["allowed ✅"] --> RE["execute → audit"]
    end

    subgraph Write["🛑 Write Path — Gated"]
        WA["'Revert commit'"] --> WB["classifyScope()"] --> WC["'write'"] --> WD["no sudo → blocked 🛑"]
        WD --> WE["Step-Up Banner"] --> WF["Human approves"] --> WG["CIBA webhook"] --> WH["mintSudoSession(5min)"]
    end

    subgraph Attack["🚫 Attack Path — Unconditional Block"]
        AA["'Delete the repo'"] --> AB["DANGEROUS_ACTIONS"] --> AC["blocked 🚫"]
    end
```

> 📖 Full architecture diagrams → [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🔒 Security Model — Defense-in-Depth

VaultSudo implements a **4-layer security model** where each layer is independent — compromising one layer cannot bypass another:

| Layer | Mechanism | Key Property |
|-------|-----------|-------------|
| **Layer 1: Scope Classification** | Every tool mapped to `read` or `write`. Unknown tools default to `write`. | **Fail-closed** — hallucinated tools can't bypass |
| **Layer 2: Dangerous Action Blocklist** | `delete_repo`, `force_push`, `delete_branch` — checked **before** session eval | **Unconditional** — no session can override |
| **Layer 3: Sudo Session Validation** | Glob pattern matching + TTL expiry + `approved_actions[]` list | **Scope-bound** — can't reuse for different actions |
| **Layer 4: Immutable Audit Trail** | Every gate evaluation logged with action intent hashes | **Tamper-evident** — SOC2/ISO 27001 ready |

### Threat Vectors Defended

| Vector | Defense |
|--------|---------|
| Prompt Injection | Dangerous Action Blocklist (unconditional) |
| Indirect Prompt Injection | Dangerous Action Blocklist + Scope Classification |
| Privilege Escalation | Unknown tools → `write` scope + `__blocked__/unknown` pattern |
| Session Hijacking | `approved_actions[]` list enforcement |
| Temporal Abuse | TTL expiry (default 10min, recommended 5min) |
| Tool Invention | Unknown tools fail-closed to `write` |

### Compliance Mapping

| Standard | VaultSudo Feature |
|----------|------------------|
| **SOC 2 (CC6.1)** | Immutable audit trail with action intent hashes |
| **SOC 2 (CC6.3)** | Scope-bound, time-limited authorization tokens |
| **ISO 27001 (A.9.2)** | Least privilege via read/write scope classification |
| **OWASP AI Security** | Prompt injection defense via dangerous action blocklist |
| **NIST AI RMF** | Human-in-the-loop approval for consequential actions |

> 📖 Full security model → [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md)

---

## 🚀 Getting Started

### Quick Start (Mock Mode — Zero Config)

```bash
git clone https://github.com/edycutjong/vaultsudo.git
cd vaultsudo
npm install
cp .env.example .env.local   # NEXT_PUBLIC_USE_MOCK=true is already set
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and follow the demo scenes below.

### Demo Walkthrough

| Step | Action | What Happens |
|------|--------|-------------|
| 1 | Click **"Safe Read — No Auth Needed"** | Agent reads CI + commits autonomously. All green. |
| 2 | Click **"Write Blocked — Step-Up Auth Required"** | Agent tries `revert_commit` → VaultSudo blocks → Step-Up Banner appears |
| 3 | Click **"Approve"** on the banner | Sudo Session minted (5min, scope-bound) |
| 4 | Click **"🔴 Prompt Injection Attack"** | Agent hijacked → tries `delete_repo` → **BLOCKED** instantly |

> 📖 Full demo script with voiceover cues → [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_USE_MOCK` | Yes | `true` | Enable mock mode |
| `OPENAI_API_KEY` | If mock=false | — | LLM API key |
| `AUTH0_*` | If mock=false | — | Auth0 CIBA configuration |
| `NEXT_PUBLIC_SUPABASE_URL` | If mock=false | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | If mock=false | — | Supabase service role key |

> 📖 Full deployment guide → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🔌 API Reference

### `POST /api/agent` — Agent message handler
Handles user messages, tool call simulation, and VaultSudo gating.

```bash
# Read operation (allowed)
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Investigate the failing CI pipeline"}'

# Write operation (blocked → step-up auth)
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Revert the bad commit"}'
```

### `GET /api/audit` — Immutable audit trail
```bash
curl http://localhost:3000/api/audit?limit=10
```

### `POST /api/demo/attack` — Attack simulation
```bash
curl -X POST http://localhost:3000/api/demo/attack \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-id"}'
```

### `POST /api/webhook/ciba` — CIBA approval callback
```bash
curl -X POST http://localhost:3000/api/webhook/ciba \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "session-id", "action_id": "act_...", "approved": true}'
```

> 📖 Full API reference with types → [docs/API_REFERENCE.md](docs/API_REFERENCE.md)

---

## 📁 Project Structure

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

---

## 🗺 Roadmap

| Phase | Milestone | Status |
|-------|-----------|--------|
| **Phase 1** | Hackathon MVP — full security model with mock data | ✅ Complete |
| **Phase 2** | Supabase audit trail, Auth0 CIBA, persistent sessions, real LLM agent | 🔜 Q2 2026 |
| **Phase 3** | Multi-tenant, policy engine, advanced session management, alerting | 📋 Q3 2026 |
| **Phase 4** | `@vaultsudo/middleware` npm package, multi-agent support, 3rd-party integrations | 📋 Q4 2026 |

> 📖 Full roadmap with technical details → [docs/ROADMAP.md](docs/ROADMAP.md)

---

## 🏗 Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | Next.js 16 (App Router) | SSR, API routes, React 19 |
| **Styling** | Tailwind CSS v4 | Utility-first styling |
| **Animation** | Framer Motion 12 | Step-up banner, terminal animations |
| **Auth (planned)** | Auth0 CIBA | Out-of-band push authentication |
| **Agent (planned)** | Vercel AI SDK | LLM orchestration |
| **Database (planned)** | Supabase (PostgreSQL + RLS) | Immutable audit trail |
| **Testing** | Vitest | Unit and coverage testing |

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, request flows, core components |
| [Security Model](docs/SECURITY_MODEL.md) | Threat model, 4-layer defense, CIBA, compliance |
| [API Reference](docs/API_REFERENCE.md) | All endpoints, types, examples |
| [Demo Script](docs/DEMO_SCRIPT.md) | Scene-by-scene Loom recording guide |
| [Deployment](docs/DEPLOYMENT.md) | Setup, environment variables, Docker, production |
| [Roadmap](docs/ROADMAP.md) | Phase 1–4 product evolution |

---

## 🏆 Hackathons

Built for:
- **HackVision 2026**
- **Auth0 "Authorized to Act"**

---

## 📄 License

MIT — see [LICENSE](LICENSE) file.
