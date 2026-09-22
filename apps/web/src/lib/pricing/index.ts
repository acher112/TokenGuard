import { db } from "@/lib/db/client";
import { modelPricing } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Centralized pricing engine.
 *
 * ALL cost calculations go through this module.
 * Prices are stored in the `model_pricing` table — never hard-coded in business logic.
 *
 * Costs are always labeled "estimated" in the UI because:
 * - Provider billing may differ (batch discounts, cached tokens, etc.)
 * - Prices can change between our table update and provider change
 */

export interface ModelPricingData {
  modelName: string;
  provider: string;
  inputPricePer1k: number;   // USD per 1,000 input tokens
  outputPricePer1k: number;  // USD per 1,000 output tokens
}

/**
 * Calculates estimated cost for an LLM call.
 * Returns cost in USD as a string to avoid floating-point precision issues.
 */
export async function calculateLlmCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): Promise<{ costUsd: string; found: boolean }> {
  const pricing = await getModelPricing(modelName);

  if (!pricing) {
    // Unknown model — return $0 with a flag
    return { costUsd: "0", found: false };
  }

  const inputCost = (inputTokens / 1000) * pricing.inputPricePer1k;
  const outputCost = (outputTokens / 1000) * pricing.outputPricePer1k;
  const totalCost = inputCost + outputCost;

  // Round to 6 decimal places (sub-cent precision)
  return { costUsd: totalCost.toFixed(6), found: true };
}

/**
 * Look up pricing for a model name.
 * Case-insensitive. Returns null if model is unknown.
 */
export async function getModelPricing(
  modelName: string
): Promise<ModelPricingData | null> {
  // Normalize: lowercase, trim
  const normalized = modelName.toLowerCase().trim();

  const rows = await db
    .select()
    .from(modelPricing)
    .where(eq(modelPricing.isActive, true))
    .limit(100);

  // Find exact match first, then prefix match (e.g. "gpt-4o-2024-11-20" → "gpt-4o")
  const exact = rows.find(
    (r) => r.modelName.toLowerCase() === normalized
  );
  if (exact) {
    return {
      modelName: exact.modelName,
      provider: exact.provider,
      inputPricePer1k: parseFloat(exact.inputPricePer1k),
      outputPricePer1k: parseFloat(exact.outputPricePer1k),
    };
  }

  // Prefix match for versioned model names
  const prefix = rows.find((r) => normalized.startsWith(r.modelName.toLowerCase()));
  if (prefix) {
    return {
      modelName: prefix.modelName,
      provider: prefix.provider,
      inputPricePer1k: parseFloat(prefix.inputPricePer1k),
      outputPricePer1k: parseFloat(prefix.outputPricePer1k),
    };
  }

  // Fallback to static list if not seeded in DB
  const staticMatch = DEFAULT_MODEL_PRICING.find(
    (m) => m.modelName.toLowerCase() === normalized || normalized.startsWith(m.modelName.toLowerCase())
  );
  if (staticMatch) {
    return {
      modelName: staticMatch.modelName,
      provider: staticMatch.provider,
      inputPricePer1k: staticMatch.inputPricePer1k,
      outputPricePer1k: staticMatch.outputPricePer1k,
    };
  }

  return null;
}

/**
 * Default model pricing seed data.
 * Run `pnpm db:seed` to insert these into the database.
 * Prices should be updated regularly from provider pricing pages.
 * Last updated: 2025-01
 */
export const DEFAULT_MODEL_PRICING: Omit<ModelPricingData, never>[] = [
  // Groq
  { modelName: "openai/gpt-oss-20b", provider: "groq", inputPricePer1k: 0.000075, outputPricePer1k: 0.0003 },
  { modelName: "openai/gpt-oss-120b", provider: "groq", inputPricePer1k: 0.00015, outputPricePer1k: 0.0006 },
  { modelName: "llama-3.1-8b-instant", provider: "groq", inputPricePer1k: 0.00005, outputPricePer1k: 0.00008 },
  { modelName: "llama-3.3-70b-versatile", provider: "groq", inputPricePer1k: 0.00059, outputPricePer1k: 0.00079 },
  { modelName: "mixtral-8x7b-32768", provider: "groq", inputPricePer1k: 0.00024, outputPricePer1k: 0.00024 },
  { modelName: "gemma2-9b-it", provider: "groq", inputPricePer1k: 0.0002, outputPricePer1k: 0.0002 },
  // OpenAI
  { modelName: "gpt-4o", provider: "openai", inputPricePer1k: 0.0025, outputPricePer1k: 0.01 },
  { modelName: "gpt-4o-mini", provider: "openai", inputPricePer1k: 0.00015, outputPricePer1k: 0.0006 },
  { modelName: "gpt-4-turbo", provider: "openai", inputPricePer1k: 0.01, outputPricePer1k: 0.03 },
  { modelName: "gpt-4", provider: "openai", inputPricePer1k: 0.03, outputPricePer1k: 0.06 },
  { modelName: "gpt-3.5-turbo", provider: "openai", inputPricePer1k: 0.0005, outputPricePer1k: 0.0015 },
  { modelName: "o1", provider: "openai", inputPricePer1k: 0.015, outputPricePer1k: 0.06 },
  { modelName: "o1-mini", provider: "openai", inputPricePer1k: 0.003, outputPricePer1k: 0.012 },
  { modelName: "o3-mini", provider: "openai", inputPricePer1k: 0.0011, outputPricePer1k: 0.0044 },
  // Anthropic
  { modelName: "claude-3-5-sonnet", provider: "anthropic", inputPricePer1k: 0.003, outputPricePer1k: 0.015 },
  { modelName: "claude-3-5-haiku", provider: "anthropic", inputPricePer1k: 0.0008, outputPricePer1k: 0.004 },
  { modelName: "claude-3-opus", provider: "anthropic", inputPricePer1k: 0.015, outputPricePer1k: 0.075 },
  { modelName: "claude-3-sonnet", provider: "anthropic", inputPricePer1k: 0.003, outputPricePer1k: 0.015 },
  { modelName: "claude-3-haiku", provider: "anthropic", inputPricePer1k: 0.00025, outputPricePer1k: 0.00125 },
  // Google
  { modelName: "gemini-1.5-pro", provider: "google", inputPricePer1k: 0.00125, outputPricePer1k: 0.005 },
  { modelName: "gemini-1.5-flash", provider: "google", inputPricePer1k: 0.000075, outputPricePer1k: 0.0003 },
  { modelName: "gemini-2.0-flash", provider: "google", inputPricePer1k: 0.0001, outputPricePer1k: 0.0004 },
];
