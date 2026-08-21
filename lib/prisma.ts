import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/lib/generated/prisma/client";

// @neondatabase/serverless's Pool (what PrismaNeon uses under the hood)
// connects over WebSocket, which needs a real WebSocket implementation.
// Recent Node has one built in (this app's local dev/build machine does),
// but Vercel's serverless function runtime may not — without this, queries
// fail with an opaque WebSocket ErrorEvent instead of a real error message.
neonConfig.webSocketConstructor = ws;
// Belt-and-suspenders: even with the polyfill above, WebSocket connections
// from inside a serverless function are the least reliable part of this
// stack. poolQueryViaFetch routes plain queries over HTTP fetch instead
// (Neon's own documented workaround for serverless WebSocket flakiness),
// falling back to WebSocket only for things fetch can't do (transactions).
neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
