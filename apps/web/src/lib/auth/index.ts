/**
 * Auth module public API.
 *
 * All app code imports from here — not from the underlying provider directly.
 * To swap auth providers, change only this file and `config.ts`.
 */
export { auth, signIn, signOut, handlers } from "./config";
export type { AuthUser, AuthSession } from "./interface";
