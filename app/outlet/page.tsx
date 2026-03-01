import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { OutletQuickOrder } from "@/components/outlet-quick-order";

export default async function OutletPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "OUTLET") redirect("/");

  return <OutletQuickOrder locale={normalizeLocale(session.user.locale)} />;
}
