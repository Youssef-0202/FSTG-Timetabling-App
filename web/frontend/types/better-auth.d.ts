import type { User as BetterAuthUser } from "better-auth";
import type { User as BetterAuthClientUser } from "better-auth/client";

// Extend the server-side User type
declare module "better-auth" {
  interface User extends BetterAuthUser {
    role: string;
  }
}

// Extend the client-side User type
declare module "better-auth/client" {
  interface User extends BetterAuthClientUser {
    role: string;
  }
}
