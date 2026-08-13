import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: normalizeEmail(profile.email),
          image: profile.picture,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email) {
        return false;
      }

      if (
        profile &&
        "email_verified" in profile &&
        profile.email_verified === false
      ) {
        return false;
      }

      const email = normalizeEmail(user.email);
      const authorizedEmail = await db.authorizedEmail.findUnique({
        where: { email },
        select: { active: true },
      });

      if (!authorizedEmail?.active) {
        return false;
      }

      const existingUser = await db.user.findUnique({
        where: { email },
        select: { isActive: true },
      });

      return existingUser?.isActive !== false;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.email = user.email;
        session.user.name = user.name;
        session.user.image = user.image;
        session.user.isAiLearningSource = user.isAiLearningSource ?? false;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.email) {
        return;
      }

      const email = normalizeEmail(user.email);
      const authorizedEmail = await db.authorizedEmail.findUnique({
        where: { email },
        select: { isAiLearningSource: true },
      });

      await db.user.update({
        where: { id: user.id },
        data: {
          email,
          lastLoginAt: new Date(),
          isAiLearningSource: authorizedEmail?.isAiLearningSource ?? false,
        },
      });
    },
  },
};
