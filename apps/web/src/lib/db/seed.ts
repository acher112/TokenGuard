/**
 * Database seed script.
 * Run: npx tsx src/lib/db/seed.ts
 *
 * Seeds: model_pricing table with current pricing data.
 * Safe to re-run — uses upsert (insert or ignore if exists).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { modelPricing } from "./schema";
import { DEFAULT_MODEL_PRICING } from "../pricing";
import { sql } from "drizzle-orm";

async function seed() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);

  console.log("🌱 Seeding model_pricing table...");

  for (const pricing of DEFAULT_MODEL_PRICING) {
    await db
      .insert(modelPricing)
      .values({
        modelName: pricing.modelName,
        provider: pricing.provider,
        inputPricePer1k: pricing.inputPricePer1k.toString(),
        outputPricePer1k: pricing.outputPricePer1k.toString(),
        isActive: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: modelPricing.modelName,
        set: {
          inputPricePer1k: sql`excluded.input_price_per_1k`,
          outputPricePer1k: sql`excluded.output_price_per_1k`,
          updatedAt: new Date(),
        },
      });

    console.log(`  ✓ ${pricing.provider}/${pricing.modelName}`);
  }

  console.log(`\n✅ Seeded ${DEFAULT_MODEL_PRICING.length} model prices.`);
  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
