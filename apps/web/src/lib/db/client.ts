import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// ─── Validate env ─────────────────────────────────────────────────────────────

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/agentwatch_placeholder";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  // Warn in development if not configured
  console.warn(
    "[AgentWatch] DATABASE_URL is not set. Database operations will fail. Copy .env.example to apps/web/.env.local."
  );
}

const client = postgres(connectionString, {
  // Prevent Edge Runtime from complaining about node APIs
  prepare: false,
  // Max connections (keep low for Supabase free tier)
  max: process.env.NODE_ENV === "production" ? 10 : 1,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
