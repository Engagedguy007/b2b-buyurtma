import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { CourierDashboard } from "@/components/courier-dashboard";

export default async function CourierPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "COURIER") redirect("/");

  return <CourierDashboard />;
}
