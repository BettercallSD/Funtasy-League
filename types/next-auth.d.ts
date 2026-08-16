import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }
}

// The `jwt` callback's `token` param is typed against @auth/core/jwt's JWT
// interface directly (next-auth/jwt just re-exports it), so augmentation has
// to target that module for the merge to actually apply.
declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    isAdmin?: boolean;
  }
}
