<div align="center">
  <img src="./public/icon.svg" width="120" height="120" alt="VaultSudo Icon" />
  <h1>VaultSudo</h1>
  <p><strong>Zero-Trust <code>sudo</code> for AI Agents</strong></p>
  <p>Read freely. Write never — unless you prove you're human.</p>
</div>

---

## 🛑 The Problem

We are entering the era of Autonomous AI Agents. These agents are given access to production databases, cloud infrastructure, and GitHub repositories to "do work" for us.

However, the current security paradigm is broken: **Agents are given permanent, over-privileged API keys.** If an agent gets hit with a prompt injection attack or hallucinates, it can delete a repository, push bad code, or drop a database in milliseconds before a human can stop it.

## 🟢 The Solution: VaultSudo

VaultSudo acts as a middleware interception layer between an AI Agent and its tools, modeled after the Unix `sudo` command.

1. **Zero-Trust by Default:** Agents are granted permanent `READ` access, allowing them to autonomously investigate bugs, read documentation, and analyze data without bothering you.
2. **Step-Up Authentication:** The exact millisecond the agent attempts a `WRITE` action (e.g., `merge_pull_request`, `drop_table`), VaultSudo **blocks the request**.
3. **Action Intent Auth:** VaultSudo sends a push notification (Out-of-Band CIBA) to the human's device showing the exact "Action Intent Diff".
4. **Sudo Sessions:** If the human approves, VaultSudo dynamically mints a short-lived (5-minute), scope-bound token allowing the agent to execute that specific action.

## 🛠 Features

- **Cybersecurity Dashboard:** A slick, dark-themed UI built with Next.js 16 and Framer Motion to monitor your agents in real-time.
- **Agent Terminal:** Chat directly with the agent. Watch it securely execute read operations and hit the VaultSudo wall on write operations.
- **Prompt Injection Demo:** A built-in "attack button" that demonstrates VaultSudo blocking a hijacked agent from running `delete_repo`.
- **Immutable Audit Trail:** Every single tool call, approval, and denial is immutably logged for SOC2 compliance.

## 🚀 Getting Started (Mock Mode)

To make it incredibly easy to test VaultSudo for hackathon evaluations, the project ships with a **Mock Mode** by default. This uses an in-memory session store and simulates the LLM responses so you don't need any API keys to see it in action!

1. **Clone & Install**
   ```bash
   git clone https://github.com/your-username/vaultsudo.git
   cd vaultsudo
   npm install
   ```

2. **Set up the Environment**
   ```bash
   cp .env.example .env.local
   ```
   *(Ensure `NEXT_PUBLIC_USE_MOCK=true` is set inside `.env.local`)*

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

4. **Experience VaultSudo**
   Open [http://localhost:3000](http://localhost:3000) in your browser.
   - Type `"Investigate the failing CI"` to see safe read execution.
   - Type `"Revert the bad commit"` to trigger the Step-Up Auth block.
   - Click the red **"Prompt Injection Demo"** button to see an attack get intercepted.

## 🏗 Tech Stack (Phase 2)

While Mock Mode is great for demos, VaultSudo is architected to plug into enterprise backends:
* **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, Framer Motion
* **Authentication:** Auth0 CIBA (Client Initiated Backchannel Authentication)
* **Agent Framework:** Vercel AI SDK
* **Database:** Supabase (PostgreSQL with RLS for immutable audit trails)

## 🏆 Hackathons
Built for:
- **HackVision 2026**
- **Auth0 "Authorized to Act"**
