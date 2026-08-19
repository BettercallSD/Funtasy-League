import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// Base32-ish alphabet with ambiguous characters (0/O, 1/I/L) removed, so a
// code read aloud or hand-typed from a screenshot isn't a guessing game.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function randomCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await prisma.friendLeague.findUnique({ where: { inviteCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique invite code, please try again.");
}
