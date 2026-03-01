import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getAuthSession();
  const role = session?.user?.role;

  if (!session) redirect("/login");
  if (role === "OUTLET") redirect("/outlet");
  if (role === "MANAGER") redirect("/manager");
  if (role === "COURIER") redirect("/courier/orders");

  redirect("/login");
}
