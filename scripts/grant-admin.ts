// One-off bootstrap utility: there's no self-serve "become admin" UI by
// design (CLAUDE.md — admin status must never be settable by the client),
// so the very first admin has to be granted directly against the database.
//
// Usage: npx tsx scripts/grant-admin.ts someone@example.com
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/grant-admin.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: { isAdmin: true },
  });
  console.log(`Granted admin: ${user.name ?? user.email} (${user.id})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
