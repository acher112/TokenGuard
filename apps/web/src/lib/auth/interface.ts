/**
 * Auth abstraction layer.
 *
 * All auth operations in the app go through this interface.
 * Swap the implementation by changing the export in `index.ts`.
 *
 * Current implementation: Auth.js v5 (NextAuth) with Drizzle adapter.
 * Future: Could be replaced with Clerk, Supabase Auth, etc. without
 * changing any page or component code.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  plan: "free" | "pro" | "team";
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

/**
 * Auth provider interface — all implementations must satisfy this shape.
 * Pages use `auth()` and `signIn()` / `signOut()` from the active implementation.
 */
export interface AuthProvider {
  /** Get the current session (server-side). Returns null if not authenticated. */
  auth(): Promise<AuthSession | null>;

  /** Initiate sign-in. Redirects to provider or handles credentials. */
  signIn(provider: string, options?: Record<string, unknown>): Promise<void>;

  /** Sign the current user out and redirect to login. */
  signOut(options?: Record<string, unknown>): Promise<void>;
}
