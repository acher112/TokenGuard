import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";
import { z } from "zod";

// ─── Validation schemas ───────────────────────────────────────────────────────

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

// ─── Auth.js configuration ───────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── Adapter ──────────────────────────────────────────────────────────────
  adapter: DrizzleAdapter(db as any, {
    usersTable: users as any,
    accountsTable: accounts as any,
    sessionsTable: sessions as any,
    verificationTokensTable: verificationTokens as any,
  }),

  // ── Session strategy ──────────────────────────────────────────────────────
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // ── Providers ─────────────────────────────────────────────────────────────
  providers: [
    // Google OAuth
    // NextAuth v5 auto-reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET,
    // but we also accept GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for clarity.
    ...(
      (process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID) &&
      (process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET)
        ? [
            Google({
              clientId: (process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID)!,
              clientSecret: (process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET)!,
            }),
          ]
        : []
    ),

    // GitHub OAuth
    // NextAuth v5 auto-reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET,
    // but we also accept GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET for clarity.
    // `checks: []` disables the `iss` (issuer) validation that GitHub doesn't support
    // (fixes "unexpected iss response parameter value" in NextAuth v5 beta).
    ...(
      (process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID) &&
      (process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET)
        ? [
            GitHub({
              clientId: (process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_CLIENT_ID)!,
              clientSecret: (process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_CLIENT_SECRET)!,
              checks: ["none"] as any,
            }),
          ]
        : []
    ),

    // Email/password credentials
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1)
          .then((rows) => rows[0]);

        if (!user || !user.hashedPassword) return null;

        const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        };
      },
    }),

    // Magic link via Resend (optional — only active if RESEND_API_KEY is set)
    ...(process.env.RESEND_API_KEY
      ? [
          Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.RESEND_FROM_EMAIL ?? "noreply@tokenguard.dev",
          }),
        ]
      : []),
  ],

  // ── Pages ─────────────────────────────────────────────────────────────────
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
    newUser: "/onboarding",
  },

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On first sign-in, persist id and plan
      if (user) {
        token.id = user.id;
        token.plan = (user as { plan?: string }).plan ?? "free";
      }

      // On explicit session update (e.g. after plan upgrade)
      if (trigger === "update" && session?.plan) {
        token.plan = session.plan as string;
      }

      // Always re-fetch plan from DB on token refresh so upgrades reflect immediately
      if (token.sub) {
        const freshUser = await db
          .select({ plan: users.plan })
          .from(users)
          .where(eq(users.id, token.sub))
          .limit(1)
          .then((r) => r[0]);
        if (freshUser) {
          token.plan = freshUser.plan;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      if (token.plan) {
        (session.user as { plan?: string }).plan = token.plan as string;
      }
      return session;
    },

    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = ["/login", "/signup", "/verify-email"].some((p) =>
        request.nextUrl.pathname.startsWith(p)
      );

      if (isOnDashboard && !isLoggedIn) return false; // Redirect to login
      if (isOnAuth && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },

  // ── Security ──────────────────────────────────────────────────────────────
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
});
