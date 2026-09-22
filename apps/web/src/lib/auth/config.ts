import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
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
      // Persist plan and id in the JWT on first sign-in
      if (user) {
        token.id = user.id;
        token.plan = (user as { plan?: string }).plan ?? "free";
      }

      // When session is updated (e.g. after plan upgrade), refresh token
      if (trigger === "update" && session?.plan) {
        token.plan = session.plan as string;
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
