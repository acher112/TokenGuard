/**
 * AgentWatch Example: Customer Support Agent Tracing
 *
 * Demonstrates tracing the multi-step agent flow from Section 4 of the specification:
 * User -> LLM -> Search database -> Shipping API -> LLM -> Answer
 *
 * To run:
 * npx tsx packages/sdk/examples/customer-support-agent.ts
 */

import { AgentWatch } from "../src";

// Initialize the SDK (dryRun: true allows running without a live backend)
const aw = new AgentWatch({
  apiKey: process.env.AGENTWATCH_API_KEY || "aw_live_demo_key_1234567890",
  baseUrl: process.env.AGENTWATCH_BASE_URL || "http://localhost:3000",
  debug: true,
  dryRun: !process.env.AGENTWATCH_API_KEY,
});

async function runCustomerSupportAgent(userQuestion: string) {
  console.log(`\n🤖 User asked: "${userQuestion}"`);
  console.log("────────────────────────────────────────────");

  const result = await aw.trace(
    "customer-support-agent",
    async (trace) => {
      // 1. Initial LLM call: classify intent and extract order ID
      console.log("1. Calling GPT to parse intent...");
      const llm1 = trace.llm({
        model: "gpt-4o",
        temperature: 0.2,
        request: [{ role: "user", content: userQuestion }],
      });

      // Simulate LLM processing latency
      await new Promise((r) => setTimeout(r, 600));
      const orderId = "ORD-98231";
      llm1.end({
        inputTokens: 1204,
        outputTokens: 183,
        response: { intent: "track_order", orderId },
      });
      console.log(`   ✓ Identified intent: track_order, orderId: ${orderId}`);

      // 2. Tool call: Search database for order
      console.log("2. Querying database for order record...");
      const dbTool = trace.tool("database_search", {
        arguments: { orderId },
      });
      await new Promise((r) => setTimeout(r, 200));
      const dbResult = { trackingNumber: "TRK-FEDEX-4421", status: "in_transit" };
      dbTool.end({ result: dbResult });
      console.log(`   ✓ Found tracking number: ${dbResult.trackingNumber}`);

      // 3. Tool call: External Shipping API
      console.log("3. Calling Shipping Carrier API...");
      const shippingTool = trace.tool("shipping_carrier_api", {
        arguments: { trackingNumber: dbResult.trackingNumber },
      });
      await new Promise((r) => setTimeout(r, 1400));
      const shippingResult = {
        carrier: "FedEx",
        estimatedDelivery: "Tomorrow by 4:00 PM",
        currentLocation: "Memphis Distribution Hub, TN",
      };
      shippingTool.end({ result: shippingResult });
      console.log(`   ✓ Carrier report: Delivery ${shippingResult.estimatedDelivery}`);

      // 4. Final LLM call: Compose helpful user answer
      console.log("4. Calling GPT to compose friendly answer...");
      const llm2 = trace.llm({
        model: "gpt-4o",
        temperature: 0.7,
        request: [
          { role: "user", content: userQuestion },
          { role: "assistant", content: JSON.stringify(shippingResult) },
        ],
      });
      await new Promise((r) => setTimeout(r, 800));
      const finalAnswer = `Good news! Your order (${orderId}) is in transit with FedEx and is scheduled for delivery tomorrow by 4:00 PM.`;
      llm2.end({
        inputTokens: 2103,
        outputTokens: 214,
        response: { message: finalAnswer },
      });
      console.log("   ✓ Answer generated!");

      return finalAnswer;
    },
    {
      tags: ["production", "support", "order-tracking"],
      userId: "cust_7721",
    }
  );

  console.log("────────────────────────────────────────────");
  console.log(`\n💬 Response to user: "${result}"\n`);
}

async function main() {
  await runCustomerSupportAgent("Where is my order?");
  await aw.close();
}

main().catch(console.error);
