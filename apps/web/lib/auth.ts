import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (
          credentials.email === process.env.ADMIN_EMAIL &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "admin", email: process.env.ADMIN_EMAIL!, name: "Admin" };
        }
        return null;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Credentials admin — bypass DB check
      if (account?.provider === "credentials") return true;

      if (!user.email) return false;

      // Google — check allowed_users table
      const allowedUser = await prisma.allowedUser.findUnique({
        where: { email: user.email, isActive: true },
      });

      if (!allowedUser) {
        return "/login?error=AccessDenied";
      }

      // Upsert user profile on first login
      await prisma.userProfile.upsert({
        where: { email: user.email },
        update: {
          name: user.name || "",
          avatarUrl: user.image || null,
        },
        create: {
          email: user.email,
          name: user.name || "",
          avatarUrl: user.image || null,
          allowedUserId: allowedUser.id,
        },
      });

      // Update last login
      await prisma.allowedUser.update({
        where: { id: allowedUser.id },
        data: { lastLoginAt: new Date() },
      });

      return true;
    },

    async jwt({ token, account }) {
      // On initial sign-in, account is available
      if (account?.provider === "credentials") {
        token.role = "super_admin";
        token.branchId = null;
        token.userId = "admin";
        token.isCredentialsAdmin = true;
      } else if (!token.isCredentialsAdmin && token.email) {
        // Google auth — refresh role from DB on each session check
        try {
          const allowedUser = await prisma.allowedUser.findUnique({
            where: { email: token.email as string },
          });
          if (allowedUser) {
            token.role = allowedUser.role;
            token.branchId = allowedUser.branchId;
            token.userId = allowedUser.id;
          }
        } catch {
          // DB unavailable — keep existing token values
        }
      }

      // Sign a JWT the API server can verify
      const secret = process.env.NEXTAUTH_SECRET;
      if (secret && token.email) {
        token.accessToken = jwt.sign(
          { email: token.email, sub: token.userId as string },
          secret,
          { expiresIn: "24h" }
        );
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.branchId = token.branchId as string | null;
        session.user.id = token.userId as string;
      }
      // Expose the signed JWT so the frontend can send it as Bearer token to the API
      (session as any).accessToken = token.accessToken as string;
      return session;
    },
  },
};
