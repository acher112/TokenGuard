/**
 * TokenGuard Example: OpenAI Auto-Instrumentation
 *
 * Demonstrates wrapOpenAI automatic recording:
 * Every call to chat.completions.create is automatically intercepted and recorded
 * with token counts, latency, and model info without writing manual span calls.
 *
 * To run:
 * npx tsx packages/sdk/examples/openai-auto-instrumentation.ts
 */

import { TokenGuard, wrapOpenAI } from "../src";

// Initialize SDK
const aw = new TokenGuard({
  apiKey: process.env.TOKENGUARD_API_KEY || "tg_live_demo_key",
  dryRun: true,
  debug: true,
});

// Mock or real OpenAI instance
const mockOpenAI = {
  chat: {
    completions: {
      async create(params: any) {
        console.log(`[Mock OpenAI] Calling ${params.model}...`);
        await new Promise((r) => setTimeout(r, 400));
        return {
          id: "chatcmpl-mock-8891",
          model: params.model,
          usage: {
            prompt_tokens: 340,
            completion_tokens: 88,
            total_tokens: 428,
          },
          choices: [
            {
              message: {
                role: "assistant",
                content: "Paris is the capital of France.",
              },
            },
          ],
        };
      },
    },
  },
};

// Wrap the client
const openai = aw.wrapOpenAI(mockOpenAI);

async function main() {
  console.log("\n🚀 Running Agent with wrapOpenAI auto-instrumentation...\n");

  // Calls made inside aw.trace automatically attach to this trace
  const answer = await aw.trace("geo-qa-agent", async () => {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "What is the capital of France?" }],
      temperature: 0.3,
    });

    return res.choices[0].message.content;
  });

  console.log(`\nResult: "${answer}"`);
  await aw.close();
}

main().catch(console.error);
