import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      plan: "free" | "pro" | "team";
    };
  }

  interface User {
    plan?: "free" | "pro" | "team";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
  }
}
