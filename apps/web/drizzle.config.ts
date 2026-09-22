import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local (same as Next.js does)
config({ path: resolve(__dirname, ".env.local") });
config({ path: resolve(__dirname, ".env") });

if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required for migrations");
}

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use unpooled connection for migrations (Supabase requires this)
    url: (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)!,
  },
  verbose: true,
  strict: true,
});
