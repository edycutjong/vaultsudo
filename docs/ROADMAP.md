# 🗺 VaultSudo — Product Roadmap

> From hackathon demo to enterprise-grade security middleware.

---

## Current State: Phase 1 — Hackathon MVP ✅

The current implementation demonstrates the full VaultSudo security model with mock data:

| Feature | Status | Notes |
|---------|--------|-------|
| VaultSudo Gate (middleware) | ✅ Complete | Fully functional scope classification, session matching, dangerous action blocking |
| Cybersecurity Dashboard | ✅ Complete | Dark theme, glassmorphism, responsive layout |
| Agent Terminal | ✅ Complete | Streaming messages, color-coded types, markdown rendering |
| Permission Scopes Panel | ✅ Complete | Real-time R/W badge visualization |
| Audit Trail Viewer | ✅ Complete | Immutable log with status indicators |
| Step-Up Auth Banner | ✅ Complete | Action Intent Diff, approve/deny controls |
| Prompt Injection Demo | ✅ Complete | Attack button, red flash, blocked messaging |
| Mock Mode | ✅ Complete | Zero-config demo environment |
| Defense-in-Depth | ✅ Complete | 4-layer security model |

---

## Phase 2: Production Backend (Q2 2026)

### 2.1 — Supabase Audit Trail
- Migrate from in-memory `auditTrail[]` to Supabase PostgreSQL
- RLS policies: `anon` → read only, `service_role` → insert only
- Add `created_at` server-side timestamp (not client-derived)
- Enable realtime subscriptions for live audit trail updates

### 2.2 — Auth0 CIBA Integration
- Replace mock approval buttons with real CIBA push notifications
- Configure Auth0 backchannel delivery mode (poll or push)
- Add CIBA token polling for async approval workflows
- Support for multiple approval devices per user

### 2.3 — Persistent Sessions
- Move session store from in-memory `Map` to Supabase or Redis
- Sessions survive server restarts and deployments
- Add session cleanup cron job for expired Sudo Sessions

### 2.4 — Real LLM Agent
- Integrate Vercel AI SDK with OpenAI/Anthropic
- Replace simulated tool calls with actual GitHub API integrations
- Add streaming support for real-time agent responses

---

## Phase 3: Enterprise Features (Q3 2026)

### 3.1 — Multi-Tenant Support
- Organization-level scope policies
- Role-based access control (admin, operator, viewer)
- Per-organization audit trail isolation

### 3.2 — Advanced Session Management
- Session revocation API (manual kill before TTL)
- Session refresh (extend TTL with re-approval)
- Session narrowing (auto-narrow scope to specific resources)
- Rate limiting on Sudo Session creation

### 3.3 — Policy Engine
- Configurable scope policies per repository
- Time-of-day restrictions (no writes after hours)
- Geo-fencing (approval only from trusted locations)
- Multi-approver workflows (require 2+ human approvals)

### 3.4 — Monitoring & Alerting
- Real-time Slack/Discord notifications for blocked actions
- Weekly security digest emails
- Anomaly detection on action patterns
- SOC 2 compliance report generation

---

## Phase 4: Platform (Q4 2026)

### 4.1 — SDK / Middleware Library
- Publish `@vaultsudo/middleware` as an npm package
- Framework adapters: Express, Fastify, Hono, Next.js
- Drop-in integration for any AI agent framework

### 4.2 — Multi-Agent Support
- Separate scope policies per agent identity
- Agent trust levels (junior agent → stricter gates)
- Cross-agent audit correlation (trace actions across agents)

### 4.3 — Third-Party Tool Integrations
- GitHub API (current) → GitLab, Bitbucket, Azure DevOps
- Database tools (Supabase, PlanetScale, Neon)
- Cloud infrastructure (AWS, GCP, Azure)
- Kubernetes (kubectl commands)

### 4.4 — Admin Dashboard
- Organization-wide audit trail view
- Agent activity heatmaps
- Policy configuration UI
- Compliance certificate generation

---

## Technical Debt & Improvements

| Item | Priority | Description |
|------|----------|-------------|
| Scope pattern validation | High | Validate scope patterns at session creation time to prevent overly broad grants |
| Action intent hashing | Medium | Move from base64 encoding to SHA-256 for proper tamper detection |
| Session renewal | Medium | Allow extending active sessions without re-approval for the same scope |
| Tool registration API | Low | Dynamic tool registration instead of hardcoded `TOOL_SCOPE_MAP` |
| WebSocket audit stream | Low | Real-time audit trail via WebSocket instead of polling |

---

## Contribution Guide

### Adding a New Tool

1. Add the tool name to `TOOL_SCOPE_MAP` in `vault-sudo.ts`
2. Add the scope pattern to `TOOL_SCOPE_PATTERNS`
3. Add the tool execution logic to `tools.ts`
4. Add mock args and result messages to `route.ts`
5. Update tests

### Adding a New Security Layer

1. Add the check inside `vaultSudoGate()` in `vault-sudo.ts`
2. Ensure it runs in the correct order relative to existing layers
3. Add audit logging for the new check
4. Document the layer in `SECURITY_MODEL.md`
5. Update tests

---

## License

MIT — see `LICENSE` file.
