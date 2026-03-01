"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Order = {
  id: string;
  status: string;
  deliveryDate: string;
  totalQty: number;
  outlet: { outletProfile: { outletName: string; phone: string; address: string } | null };
};

export function CourierOrdersList({ locale }: { locale: AppLocale }) {
  const d = getDictionary(locale);
  const [orders, setOrders] = useState<Order[]>([]);

  async function load() {
    const res = await fetch("/api/courier/orders", { cache: "no-store" });
    setOrders(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-3 pb-24">
      <div className="card">
        <h1 className="text-xl font-bold">{d["courier.listTitle"]}</h1>
      </div>

      {orders.map((order) => (
        <Link key={order.id} href={`/courier/orders/${order.id}`} className="card block space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{order.outlet.outletProfile?.outletName || "Outlet"}</p>
            <p className="text-xs text-slate-500">{order.status}</p>
          </div>
          <p className="text-sm text-slate-600">{order.outlet.outletProfile?.address}</p>
          <p className="text-sm">{new Date(order.deliveryDate).toLocaleString("uz-UZ")} | {order.totalQty} dona</p>
        </Link>
      ))}
    </div>
  );
}
