import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { normalizeLocale } from "@/lib/i18n";
import { CourierOrderDetail } from "@/components/courier-order-detail";

export default async function CourierOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "COURIER") redirect("/");

  const { id } = await params;
  return <CourierOrderDetail orderId={id} locale={normalizeLocale(session.user.locale)} />;
}
