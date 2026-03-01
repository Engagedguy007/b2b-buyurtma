import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { CourierOrdersList } from "@/components/courier-orders-list";

export default async function CourierOrdersPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "COURIER") redirect("/");

  return <CourierOrdersList locale={normalizeLocale(session.user.locale)} />;
}
