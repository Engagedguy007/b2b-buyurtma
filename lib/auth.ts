import { Locale, UserRole } from "@prisma/client";
import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

const LONG_MAX_AGE = 60 * 24 * 60 * 60;
const SHORT_MAX_AGE = 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: LONG_MAX_AGE,
    updateAge: 24 * 60 * 60
  },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Parol", type: "password" },
        remember: { label: "Remember", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true }
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        const remember = credentials.remember !== "false";

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          companyId: user.companyId,
          locale: user.locale || user.company.defaultLocale,
          remember
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
        token.isActive = (user as { isActive: boolean }).isActive;
        token.companyId = (user as { companyId: string }).companyId;
        token.locale = (user as { locale: Locale }).locale;
        token.remember = (user as { remember: boolean }).remember;
      }

      const now = Math.floor(Date.now() / 1000);
      if (token.remember === false) {
        token.exp = now + SHORT_MAX_AGE;
      } else {
        token.exp = now + LONG_MAX_AGE;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.isActive = token.isActive as boolean;
        session.user.companyId = token.companyId as string;
        session.user.locale = token.locale as Locale;
        session.user.remember = (token.remember as boolean | undefined) ?? true;
      }
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  }
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}
