import { UserRole } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";

export async function requireRole(roles: UserRole[]) {
  const session = await getAuthSession();
  const role = session?.user?.role;
  if (!session || !role || !roles.includes(role)) {
    return { error: "Ruxsat yo'q", status: 403 as const };
  }

  return { session };
}
