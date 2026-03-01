import { Locale, UserRole } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isActive: boolean;
      companyId: string;
      locale: Locale;
      remember: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    isActive: boolean;
    companyId: string;
    locale: Locale;
    remember: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    isActive: boolean;
    companyId: string;
    locale: Locale;
    remember?: boolean;
  }
}
