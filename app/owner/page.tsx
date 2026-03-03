import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { ManagerDashboard } from "@/components/manager-dashboard";

export default async function OwnerPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/");

  return <ManagerDashboard />;
}
