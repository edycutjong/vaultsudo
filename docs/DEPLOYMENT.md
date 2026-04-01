# 🚀 VaultSudo — Deployment & Setup Guide

> From clone to running demo in under 2 minutes.

---

## Quick Start (Mock Mode)

Mock mode is the default. It requires **zero** external configuration — no API keys, no database, no Auth0 setup.

```bash
# Clone
git clone https://github.com/your-username/vaultsudo.git
cd vaultsudo

# Install dependencies
npm install

# Set up environment (mock mode is the default)
cp .env.example .env.local

# Start the dev server
npm run dev

# Open http://localhost:3000
```

### Verify Mock Mode

Check that `.env.local` contains:

```env
NEXT_PUBLIC_USE_MOCK=true
```

When this is set to `true`, the app:
- Uses an in-memory session store (no database needed)
- Simulates LLM responses (no OpenAI key needed)
- Simulates CIBA approval via dashboard buttons (no Auth0 needed)
- **All security logic is fully operational** — the VaultSudo gate runs the same code

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_USE_MOCK` | Yes | `true` | Enable mock mode for demonstrations |
| `OPENAI_API_KEY` | If mock=false | — | OpenAI or Anthropic API key for LLM agent |
| `AUTH0_SECRET` | If mock=false | — | 32-byte random string for session encryption |
| `AUTH0_BASE_URL` | If mock=false | `http://localhost:3000` | Application base URL |
| `AUTH0_ISSUER_BASE_URL` | If mock=false | — | Auth0 tenant URL |
| `AUTH0_CLIENT_ID` | If mock=false | — | Auth0 CIBA application client ID |
| `AUTH0_CLIENT_SECRET` | If mock=false | — | Auth0 CIBA application client secret |
| `NEXT_PUBLIC_SUPABASE_URL` | If mock=false | — | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | If mock=false | — | Supabase service role key (writes) |

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 22+ | `node --version` |
| npm | 10+ | `npm --version` |

---

## Development

### Start Dev Server

```bash
npm run dev
```

The server starts at `http://localhost:3000` with hot module replacement.

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

### Run Tests

```bash
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

---

## Production Deployment (Future)

### Vercel

VaultSudo is a standard Next.js 16 app — deploy directly to Vercel:

1. Push to GitHub
2. Connect the repo to Vercel
3. Set environment variables (mock=false, add all keys)
4. Deploy

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Production Setup: Auth0 CIBA

To enable real push-notification approval (replacing mock buttons):

1. **Create an Auth0 Application** with CIBA grant type enabled
2. **Configure Backchannel Authentication Settings:**
   - Delivery mode: `poll` or `push`
   - Notification endpoint: `https://your-domain.com/api/webhook/ciba`
3. **Set Environment Variables:**
   ```env
   AUTH0_SECRET=<random-32-byte-string>
   AUTH0_BASE_URL=https://your-domain.com
   AUTH0_ISSUER_BASE_URL=https://your-tenant.us.auth0.com
   AUTH0_CLIENT_ID=<your-client-id>
   AUTH0_CLIENT_SECRET=<your-client-secret>
   ```
4. **Update** `NEXT_PUBLIC_USE_MOCK=false`

### Production Setup: Supabase

To enable persistent, immutable audit trails:

1. **Create a Supabase Project**
2. **Run the schema migration:**
   ```sql
   -- See db/schema.sql for the full schema
   CREATE TABLE audit_log (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     created_at TIMESTAMPTZ DEFAULT now(),
     user_id TEXT NOT NULL,
     action TEXT NOT NULL,
     scope TEXT NOT NULL,
     status TEXT NOT NULL,
     resource TEXT,
     agent_reasoning TEXT,
     action_intent_hash TEXT,
     token_ttl_seconds INTEGER,
     approval_method TEXT
   );

   -- RLS: anon can read, only service_role can write
   ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Allow public read" ON audit_log FOR SELECT USING (true);
   CREATE POLICY "Allow service write" ON audit_log FOR INSERT
     WITH CHECK (auth.role() = 'service_role');
   ```
3. **Set Environment Variables:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhb...
   ```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Module not found` errors | Run `npm install` |
| Port 3000 already in use | Kill the existing process or use `PORT=3001 npm run dev` |
| Session data lost on refresh | Expected in mock mode — in-memory store resets on HMR |
| TypeScript errors on build | Run `npx tsc --noEmit` to see full error output |
| "Failed to compile" after edit | Check for syntax errors in the file you just edited |
