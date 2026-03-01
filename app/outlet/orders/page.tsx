import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { OutletOrdersTracking } from "@/components/outlet-orders-tracking";

export default async function OutletOrdersPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "OUTLET") redirect("/");

  return <OutletOrdersTracking locale={normalizeLocale(session.user.locale)} />;
}
