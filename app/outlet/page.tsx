import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { OutletQuickOrder } from "@/components/outlet-quick-order";

export default async function OutletPage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "OUTLET") redirect("/");

  return <OutletQuickOrder />;
}
