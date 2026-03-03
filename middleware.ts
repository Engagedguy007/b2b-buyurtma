import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

function canAccess(pathname: string, role?: string) {
  if (!role) return false;
  if (pathname.startsWith("/outlet")) return role === "OUTLET";
  if (pathname.startsWith("/owner") || pathname.startsWith("/manager")) return role === "OWNER";
  if (pathname.startsWith("/courier")) return role === "COURIER";
  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const protectedRoute = ["/outlet", "/owner", "/manager", "/courier", "/profile"].some((prefix) => pathname.startsWith(prefix));

  if (!protectedRoute) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  if (!token.companyId) return NextResponse.redirect(new URL("/login", req.url));

  if (!canAccess(pathname, token.role as string | undefined)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/outlet/:path*", "/owner/:path*", "/manager/:path*", "/courier/:path*", "/profile/:path*"]
};
