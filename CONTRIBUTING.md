# Contributing to AgentWatch

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

## Development Setup

```bash
pnpm install
cp .env.example apps/web/.env.local
# Fill in apps/web/.env.local

pnpm --filter @agentwatch/web db:generate
pnpm --filter @agentwatch/web db:migrate
pnpm dev
```

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` maintenance

## Project Structure

```
apps/web/src/
  app/          ← Next.js App Router pages and API routes
  components/   ← UI components
  lib/          ← Business logic (auth, db, pricing, billing)
  hooks/        ← React hooks
  types/        ← TypeScript type declarations

packages/sdk/src/
  client.ts     ← AgentWatch class
  types.ts      ← All TypeScript types
  index.ts      ← Public exports
```

## Adding a New Feature

1. Check that it's in the spec or approved
2. Add DB schema changes (with migration)
3. Add API route with Zod validation
4. Add dashboard page
5. Verify existing tests still pass
