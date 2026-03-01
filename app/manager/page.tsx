import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { ManagerDashboard } from "@/components/manager-dashboard";

export default async function ManagerPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/");

  return <ManagerDashboard />;
}
