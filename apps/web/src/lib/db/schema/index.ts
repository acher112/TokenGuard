import { pgTable, text, timestamp, integer, boolean, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@/lib/db/utils";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["free", "pro", "team"]);
export const traceStatusEnum = pgEnum("trace_status", ["running", "success", "failed", "timeout"]);
export const stepTypeEnum = pgEnum("step_type", ["llm", "tool", "error", "custom"]);
export const toolStatusEnum = pgEnum("tool_status", ["success", "failed", "timeout"]);
export const alertMetricEnum = pgEnum("alert_metric", ["daily_cost", "per_request_cost", "error_rate", "error_count"]);
export const alertOperatorEnum = pgEnum("alert_operator", ["gt", "lt", "gte", "lte"]);
export const alertChannelEnum = pgEnum("alert_channel", ["email", "webhook", "slack"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "past_due", "paused", "trialing"]);
export const retentionDaysEnum = pgEnum("retention_days", ["7", "30", "90"]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(createId),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  hashedPassword: text("hashed_password"), // null for OAuth users
  image: text("image"),
  plan: planEnum("plan").notNull().default("free"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

// ─── Auth.js required tables ─────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => ({
  providerIdx: uniqueIndex("accounts_provider_idx").on(table.provider, table.providerAccountId),
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (table) => ({
  compoundKey: uniqueIndex("verification_tokens_identifier_token_idx").on(table.identifier, table.token),
}));

// ─── Projects ────────────────────────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: text("id").primaryKey().$defaultFn(createId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  retentionDays: retentionDaysEnum("retention_days").notNull().default("7"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("projects_user_id_idx").on(table.userId),
}));

// ─── API Keys ─────────────────────────────────────────────────────────────────

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(createId),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Default"),
  // Only the sha256 hash is stored — the raw key is shown once at creation
  keyHash: text("key_hash").notNull(),
  // First 12 chars stored for display (e.g. "tg_live_abc1...")
  keyPrefix: text("key_prefix").notNull(),
  lastUsedAt: timestamp("last_used_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { mode: "date" }),
}, (table) => ({
  hashIdx: uniqueIndex("api_keys_hash_idx").on(table.keyHash),
  projectIdx: index("api_keys_project_id_idx").on(table.projectId),
}));

// ─── Model Pricing ────────────────────────────────────────────────────────────
// Centralized pricing table — no prices hard-coded elsewhere in the app

export const modelPricing = pgTable("model_pricing", {
  id: text("id").primaryKey().$defaultFn(createId),
  modelName: text("model_name").notNull(),
  provider: text("provider").notNull(),
  // Prices in USD per 1,000 tokens
  inputPricePer1k: text("input_price_per_1k").notNull(),  // stored as string to avoid float rounding
  outputPricePer1k: text("output_price_per_1k").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  modelIdx: uniqueIndex("model_pricing_name_idx").on(table.modelName),
}));

// ─── Traces ───────────────────────────────────────────────────────────────────

export const traces = pgTable("traces", {
  id: text("id").primaryKey().$defaultFn(createId),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  agentName: text("agent_name").notNull(),
  status: traceStatusEnum("status").notNull().default("running"),
  // Session grouping — groups multi-turn conversations
  sessionId: text("session_id"),
  // Estimated total cost in USD (sum of all LLM call costs)
  totalCostUsd: text("total_cost_usd").notNull().default("0"),
  totalInputTokens: integer("total_input_tokens").notNull().default(0),
  totalOutputTokens: integer("total_output_tokens").notNull().default(0),
  durationMs: integer("duration_ms"),
  // Metadata
  tags: text("tags").array(),
  userId: text("user_id"),   // end-user identifier (optional, for customer apps)
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { mode: "date" }),
}, (table) => ({
  projectIdx: index("traces_project_id_idx").on(table.projectId),
  startedAtIdx: index("traces_started_at_idx").on(table.startedAt),
  agentIdx: index("traces_agent_name_idx").on(table.agentName),
  statusIdx: index("traces_status_idx").on(table.status),
  sessionIdx: index("traces_session_id_idx").on(table.sessionId),
}));

// ─── Trace Steps ──────────────────────────────────────────────────────────────

export const traceSteps = pgTable("trace_steps", {
  id: text("id").primaryKey().$defaultFn(createId),
  traceId: text("trace_id").notNull().references(() => traces.id, { onDelete: "cascade" }),
  stepType: stepTypeEnum("step_type").notNull(),
  sequence: integer("sequence").notNull(),  // order within the trace
  name: text("name"),  // human-readable label
  startedAt: timestamp("started_at", { mode: "date" }).notNull(),
  endedAt: timestamp("ended_at", { mode: "date" }),
  durationMs: integer("duration_ms"),
}, (table) => ({
  traceIdx: index("trace_steps_trace_id_idx").on(table.traceId),
}));

// ─── LLM Calls ────────────────────────────────────────────────────────────────

export const llmCalls = pgTable("llm_calls", {
  id: text("id").primaryKey().$defaultFn(createId),
  stepId: text("step_id").notNull().references(() => traceSteps.id, { onDelete: "cascade" }),
  traceId: text("trace_id").notNull().references(() => traces.id, { onDelete: "cascade" }),
  modelName: text("model_name").notNull(),
  provider: text("provider"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  // Estimated cost, labeled "estimated" in UI
  estimatedCostUsd: text("estimated_cost_usd").notNull().default("0"),
  temperature: text("temperature"),
  // Request/response stored as JSON text — can be masked via settings
  requestJson: text("request_json"),
  responseJson: text("response_json"),
  durationMs: integer("duration_ms"),
}, (table) => ({
  traceIdx: index("llm_calls_trace_id_idx").on(table.traceId),
  modelIdx: index("llm_calls_model_name_idx").on(table.modelName),
}));

// ─── Tool Calls ───────────────────────────────────────────────────────────────

export const toolCalls = pgTable("tool_calls", {
  id: text("id").primaryKey().$defaultFn(createId),
  stepId: text("step_id").notNull().references(() => traceSteps.id, { onDelete: "cascade" }),
  traceId: text("trace_id").notNull().references(() => traces.id, { onDelete: "cascade" }),
  toolName: text("tool_name").notNull(),
  status: toolStatusEnum("status").notNull().default("success"),
  argumentsJson: text("arguments_json"),
  resultJson: text("result_json"),
  durationMs: integer("duration_ms"),
}, (table) => ({
  traceIdx: index("tool_calls_trace_id_idx").on(table.traceId),
}));

// ─── Errors ───────────────────────────────────────────────────────────────────

export const errors = pgTable("errors", {
  id: text("id").primaryKey().$defaultFn(createId),
  stepId: text("step_id").references(() => traceSteps.id, { onDelete: "cascade" }),
  traceId: text("trace_id").notNull().references(() => traces.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  errorType: text("error_type").notNull(),  // e.g. "JSONParseError", "Timeout"
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  retryCount: integer("retry_count").notNull().default(0),
  // Cost wasted due to this error (retries × cost)
  wastedCostUsd: text("wasted_cost_usd").notNull().default("0"),
  occurredAt: timestamp("occurred_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("errors_project_id_idx").on(table.projectId),
  traceIdx: index("errors_trace_id_idx").on(table.traceId),
  errorTypeIdx: index("errors_error_type_idx").on(table.errorType),
  occurredAtIdx: index("errors_occurred_at_idx").on(table.occurredAt),
}));

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: text("id").primaryKey().$defaultFn(createId),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  metric: alertMetricEnum("metric").notNull(),
  operator: alertOperatorEnum("operator").notNull(),
  threshold: text("threshold").notNull(),  // numeric threshold value
  channel: alertChannelEnum("channel").notNull(),
  destination: text("destination").notNull(),  // email address or webhook URL
  isActive: boolean("is_active").notNull().default(true),
  lastTriggeredAt: timestamp("last_triggered_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  projectIdx: index("alerts_project_id_idx").on(table.projectId),
}));

export const alertEvents = pgTable("alert_events", {
  id: text("id").primaryKey().$defaultFn(createId),
  alertId: text("alert_id").notNull().references(() => alerts.id, { onDelete: "cascade" }),
  triggeredAt: timestamp("triggered_at", { mode: "date" }).notNull().defaultNow(),
  value: text("value").notNull(),  // the metric value that triggered this alert
  message: text("message"),
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(createId),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Lemon Squeezy IDs — nullable until billing is configured
  lsSubscriptionId: text("ls_subscription_id"),
  lsCustomerId: text("ls_customer_id"),
  lsOrderId: text("ls_order_id"),
  lsVariantId: text("ls_variant_id"),
  plan: planEnum("plan").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  renewalDate: timestamp("renewal_date", { mode: "date" }),
  cancelledAt: timestamp("cancelled_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex("subscriptions_user_id_idx").on(table.userId),
  lsSubIdx: index("subscriptions_ls_subscription_id_idx").on(table.lsSubscriptionId),
}));

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  projects: many(projects),
  accounts: many(accounts),
  sessions: many(sessions),
  subscription: one(subscriptions, { fields: [users.id], references: [subscriptions.userId] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  apiKeys: many(apiKeys),
  traces: many(traces),
  errors: many(errors),
  alerts: many(alerts),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  project: one(projects, { fields: [apiKeys.projectId], references: [projects.id] }),
}));

export const tracesRelations = relations(traces, ({ one, many }) => ({
  project: one(projects, { fields: [traces.projectId], references: [projects.id] }),
  steps: many(traceSteps),
  llmCalls: many(llmCalls),
  toolCalls: many(toolCalls),
  errors: many(errors),
}));

export const traceStepsRelations = relations(traceSteps, ({ one, many }) => ({
  trace: one(traces, { fields: [traceSteps.traceId], references: [traces.id] }),
  llmCall: many(llmCalls),
  toolCall: many(toolCalls),
  error: many(errors),
}));

export const llmCallsRelations = relations(llmCalls, ({ one }) => ({
  step: one(traceSteps, { fields: [llmCalls.stepId], references: [traceSteps.id] }),
  trace: one(traces, { fields: [llmCalls.traceId], references: [traces.id] }),
}));

export const toolCallsRelations = relations(toolCalls, ({ one }) => ({
  step: one(traceSteps, { fields: [toolCalls.stepId], references: [traceSteps.id] }),
  trace: one(traces, { fields: [toolCalls.traceId], references: [traces.id] }),
}));

export const errorsRelations = relations(errors, ({ one }) => ({
  step: one(traceSteps, { fields: [errors.stepId], references: [traceSteps.id] }),
  trace: one(traces, { fields: [errors.traceId], references: [traces.id] }),
  project: one(projects, { fields: [errors.projectId], references: [projects.id] }),
}));

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  project: one(projects, { fields: [alerts.projectId], references: [projects.id] }),
  events: many(alertEvents),
}));

export const alertEventsRelations = relations(alertEvents, ({ one }) => ({
  alert: one(alerts, { fields: [alertEvents.alertId], references: [alerts.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));
