# TokenGuard

> **Debug your AI agents. Understand every AI request. Find and reduce wasted AI costs.**

TokenGuard is a developer SaaS that monitors AI agents and AI-powered applications — capturing every LLM call, tool invocation, token count, latency, and cost, then surfacing them in a clean dashboard with cost intelligence.

---

## Monorepo Structure

```
tokenguard/
├── apps/
│   └── web/          # Next.js 14 dashboard + API
└── packages/
    └── sdk/          # @tokenguard/sdk npm package
```

---

## Quick Start (Local Development)

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 → `npm install -g pnpm`
- **Supabase** account (free) → https://supabase.com

### 1. Clone and install

```bash
git clone https://github.com/yourname/tokenguard
cd tokenguard
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project → Settings → Database → Connection string (Transaction mode) |
| `DATABASE_URL_UNPOOLED` | Supabase → Project → Settings → Database → Connection string (Session mode / Direct) |
| `AUTH_SECRET` | Run: `openssl rand -base64 32` |
| `RESEND_API_KEY` | https://resend.com (free tier, optional for local dev) |

> **Billing variables** (`PADDLE_*`) can be left empty — billing uses an automatic stub in local development and will not block development.

### 3. Run database migrations

```bash
pnpm --filter @tokenguard/web db:generate
pnpm --filter @tokenguard/web db:migrate
```

### 4. Seed model pricing

```bash
cd apps/web
npx tsx src/lib/db/seed.ts
cd ../..
```

### 5. Start development server

```bash
pnpm dev
```

Open http://localhost:3000

### 6. Create your account

1. Go to http://localhost:3000/signup
2. Register with email + password
3. Create your first project
4. Copy your API key from Settings

### 7. Send your first trace

```bash
# Install the SDK in your AI application
npm install @tokenguard/sdk

# Or test immediately with curl
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "test-agent",
    "status": "success",
    "startedAt": "2024-01-01T00:00:00Z",
    "endedAt": "2024-01-01T00:00:03Z",
    "durationMs": 3000,
    "steps": [{
      "stepType": "llm",
      "sequence": 1,
      "startedAt": "2024-01-01T00:00:00Z",
      "endedAt": "2024-01-01T00:00:02Z",
      "durationMs": 2000,
      "llmCall": {
        "modelName": "gpt-4o",
        "inputTokens": 500,
        "outputTokens": 150
      }
    }]
  }'
```

The trace will appear in your dashboard within seconds.

---

## SDK Usage

```typescript
import { TokenGuard } from "@tokenguard/sdk";

const aw = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY!,
  // baseUrl defaults to https://tokenguard.dev
  // For local dev: baseUrl: "http://localhost:3000"
});

const result = await aw.trace("customer-support", async (trace) => {
  // Track an LLM call
  const llmSpan = trace.llm({ model: "gpt-4o", temperature: 0.7 });
  const response = await openai.chat.completions.create({ ... });
  llmSpan.end({
    inputTokens: response.usage!.prompt_tokens,
    outputTokens: response.usage!.completion_tokens,
    response: response.choices[0],
  });

  // Track a tool call
  const toolSpan = trace.tool("database_search", {
    arguments: { query: "customer orders" }
  });
  const orders = await searchDatabase(query);
  toolSpan.end({ result: orders });

  return result;
});
```

---

## Build Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 — Foundation | ✅ **Done** | Monorepo, DB schema, Auth, Projects, API keys, Dashboard shell |
| 2 — SDK | ✅ **Done** | TypeScript SDK (OpenAI, Anthropic, Gemini wrappers), Python SDK, ingestion API, OTel endpoint |
| 3 — Dashboard | ✅ **Done** | Traces list/detail, Cost analytics, Agents, Errors, Models pages |
| 4 — Intelligence | ✅ **Done** | Cost waste detection, retry analysis, alerts engine (Email + Slack + Webhook) |
| 5 — Billing | ✅ **Done** | Paddle Billing v2 (Payoneer payouts), Free/Pro/Team plans, usage limits |
| 6 — Launch | 🔜 | Landing page (ready), deploy to Vercel, Product Hunt |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Auth | Auth.js v5 (NextAuth) |
| Charts | Recharts |
| Email | Resend |
| Billing | Paddle Billing v2 (Merchant of Record & Payoneer Payouts) |
| Hosting | Vercel + Supabase |


---

## Security

- API keys stored as SHA-256 hashes — raw key shown once at creation
- Passwords hashed with bcrypt (cost factor 12)
- All dashboard routes protected by session middleware
- Every DB query filtered by project ownership (project isolation)
- Input validated with Zod on all API routes
- Security headers set on all responses
- Data retention configurable per project (7/30/90 days)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
