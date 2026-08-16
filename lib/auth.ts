import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Google's OIDC profile shape, validated before it ever touches the database.
const googleProfileSchema = z.object({
  sub: z.string().min(1),
  email: z.email(),
  name: z.string().min(1).optional(),
  picture: z.url().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions: no Account/Session tables, the signed+httpOnly cookie
  // never carries a raw secret and is never readable by client JS.
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const parsed = googleProfileSchema.safeParse(profile);
      if (!parsed.success) return false;

      const { sub: googleId, email, name, picture } = parsed.data;
      await prisma.user.upsert({
        where: { googleId },
        update: { email, name, image: picture },
        create: { googleId, email, name, image: picture },
      });
      return true;
    },
    async jwt({ token, profile }) {
      if (profile) {
        const parsed = googleProfileSchema.safeParse(profile);
        if (parsed.success) {
          const dbUser = await prisma.user.findUnique({
            where: { googleId: parsed.data.sub },
          });
          if (dbUser) {
            token.userId = dbUser.id;
            token.isAdmin = dbUser.isAdmin;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
